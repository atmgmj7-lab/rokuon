"""
Playwright によるスクレイピング（URL優先・地域+業種でMaps）

URL: サイトをスクレイピング（解析の主軸）
Maps: 地域+業種で競合検索（任意）
"""
import asyncio
import re
from typing import Optional
from urllib.parse import quote_plus

_SCRAPE_TIMEOUT = 8


async def _run_with_timeout(coro, timeout: int = _SCRAPE_TIMEOUT):
    try:
        return await asyncio.wait_for(coro, timeout=timeout)
    except asyncio.TimeoutError:
        return None
    except Exception:
        return None


def _parse_maps_text(text: str, search_keyword: str) -> dict:
    result = {
        "region": "",
        "search_keyword": search_keyword or "",
        "competitors": [],
    }

    region_patterns = [
        r"(?:東京都|北海道|(?:京都|大阪)府|.{2,3}県)(?:[^\s、。\n]{2,15}(?:区|市|町|村))?",
        r"[^\s、。\n]{2,10}(?:区|市|町|村)(?:[^\s、。\n]{2,10}(?:区|市|町|村))?",
    ]
    for pat in region_patterns:
        m = re.search(pat, text)
        if m:
            result["region"] = m.group(0).strip()
            break

    company_pattern = r"(?:株式会社|㈱|有限会社|合同会社|一般社団法人)\s*[^\s、。！？\n★☆]{2,25}"
    rating_pattern = r"(?:★|☆|stars?)?\s*(\d+\.?\d*)\s*(?:★|☆|/|$)"
    ratings = re.findall(rating_pattern, text)
    ratings = [float(r) for r in ratings if 0 <= float(r) <= 5]

    lines = text.split("\n")
    seen = set()
    for i, line in enumerate(lines):
        for comp in re.findall(company_pattern, line):
            comp = comp.strip()
            if comp in seen or len(comp) < 4:
                continue
            seen.add(comp)
            rating = None
            search_text = line + "\n" + (lines[i + 1] if i + 1 < len(lines) else "")
            rm = re.search(rating_pattern, search_text)
            if rm:
                rating = float(rm.group(1))
            result["competitors"].append({"name": comp, "rating": rating})

    if ratings and result["competitors"]:
        idx = 0
        for c in result["competitors"]:
            if c["rating"] is None and idx < len(ratings):
                c["rating"] = ratings[idx]
                idx += 1

    return result


async def scrape_google_maps_structured(
    region: str,
    industry: str,
) -> dict:
    """
    地域 + 業種 で Google Maps 競合検索
    例: 美作市 屋根工事
    """
    search_keyword = (industry or "屋根工事").strip()
    parts = [p for p in [(region or "").strip(), search_keyword] if p]
    query = " ".join(parts) if parts else search_keyword

    try:
        from playwright.async_api import async_playwright

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            await page.goto(
                f"https://www.google.com/maps/search/?api=1&query={quote_plus(query)}",
                timeout=8000,
            )
            await page.wait_for_selector('[role="main"]', timeout=5000)

            raw = await page.evaluate(
                """
                () => {
                    const main = document.querySelector('[role=main]');
                    if (!main) return '';
                    const articles = main.querySelectorAll('[role="article"]');
                    if (articles.length > 0) {
                        return Array.from(articles).slice(0, 15).map(a => a.innerText).join('\\n---\\n');
                    }
                    return main.innerText || '';
                }
                """
            )
            await browser.close()

            return _parse_maps_text(raw[:4000], search_keyword)
    except Exception as e:
        return {
            "region": region or "",
            "search_keyword": search_keyword,
            "competitors": [],
            "error": str(e),
        }


async def scrape_hp_brief(target_url: str) -> str:
    """サイトからテキストを取得（AI解析の主軸）"""
    try:
        from playwright.async_api import async_playwright

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            await page.goto(target_url, timeout=10000)
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
            text = await page.evaluate(
                "() => document.body?.innerText?.slice(0, 6000) ?? ''"
            )
            await browser.close()
            return text
    except Exception:
        return ""


async def scrape_web_sources(
    url: str,
    region: Optional[str] = None,
    industry: Optional[str] = None,
) -> tuple[dict, str]:
    """
    URL優先: サイトをスクレイピング。地域ありならMaps競合も取得
    戻り値: (map_data: dict, hp_text: str)
    """
    hp_text = ""
    if url and url.strip().startswith("http"):
        hp_result = await _run_with_timeout(scrape_hp_brief(url.strip()))
        hp_text = hp_result if isinstance(hp_result, str) else ""

    map_data = {
        "region": (region or "").strip(),
        "search_keyword": (industry or "屋根工事").strip(),
        "competitors": [],
    }

    if (region or "").strip():
        maps_result = await _run_with_timeout(
            scrape_google_maps_structured((region or "").strip(), industry or "屋根工事")
        )
        if isinstance(maps_result, dict):
            map_data = maps_result

    return map_data, hp_text
