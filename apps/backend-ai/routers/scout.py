"""
URL優先解析 → Gemmaクリーニング → Gemini/GPT差しどころ抽出

入力URLのサイトを解析し、AIが差しどころを抽出。地域指定時はMaps競合も取得。
"""
import asyncio
import json
import time
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from services.scraper import scrape_web_sources
from services.hybrid_ai import clean_with_gemma, generate_strategy_with_cloud
from services.rag import get_relevant_knowledge

router = APIRouter()
SCOUT_TIMEOUT = 60


class ScoutRequest(BaseModel):
    url: str
    region: Optional[str] = None
    industry: Optional[str] = None


class MapCompetitor(BaseModel):
    name: str
    rating: Optional[float] = None


class MapData(BaseModel):
    region: str
    search_keyword: str
    competitors: list[MapCompetitor]


class ScoutResponse(BaseModel):
    success: bool
    map_data: dict
    web_summary: str
    ollama_available: bool
    sashi_dokoro: list[str]
    strategy: str
    knowledge_context: Optional[str] = None
    elapsed_seconds: float


async def _run_scout(request: ScoutRequest) -> ScoutResponse:
    start = time.perf_counter()
    url = (request.url or "").strip()
    if not url.startswith("http"):
        raise ValueError("有効なURLを指定してください")

    # 1. URLを優先: サイトをスクレイピング。地域ありならMaps競合も取得
    map_data, hp_text = await scrape_web_sources(
        url=url,
        region=request.region,
        industry=request.industry,
    )

    # 2. RAG
    knowledge_context = await get_relevant_knowledge(
        query=f"{request.industry or ''} {url}"
    )

    # 3. Ollama でサイト情報をクリーニング（URL解析の主軸）
    ollama_available = True
    web_summary = ""
    if hp_text:
        cleaned = await clean_with_gemma(hp_text)
        if cleaned is not None:
            web_summary = cleaned
        else:
            ollama_available = False
            web_summary = "Ollamaが未起動のため情報を整理できませんでした"
    else:
        web_summary = ""

    # 4. クラウドAI: サイト要約から差しどころを抽出
    ai_context = json.dumps(map_data, ensure_ascii=False, indent=0)
    if web_summary and ollama_available:
        ai_context = f"## サイト解析結果（URL: {url}）\n{web_summary}\n\n## マップ競合情報\n{ai_context}"
    else:
        ai_context = f"## サイト解析結果\n{web_summary or '（取得なし）'}\n\n## マップ競合情報\n{ai_context}"

    strategy_result = await generate_strategy_with_cloud(
        web_summary=ai_context,
        knowledge_context=knowledge_context,
        industry=request.industry,
    )

    elapsed = time.perf_counter() - start
    return ScoutResponse(
        success=True,
        map_data=map_data,
        web_summary=web_summary,
        ollama_available=ollama_available,
        sashi_dokoro=strategy_result.get("sashi_dokoro", []),
        strategy=strategy_result.get("strategy", ""),
        knowledge_context=knowledge_context or None,
        elapsed_seconds=round(elapsed, 2),
    )


@router.post("", response_model=ScoutResponse)
async def scout_target(request: ScoutRequest):
    """URLのサイトを解析し、差しどころを抽出"""
    try:
        return await asyncio.wait_for(_run_scout(request), timeout=SCOUT_TIMEOUT)
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=504,
            detail=f"解析が{SCOUT_TIMEOUT}秒以内に完了しませんでした。",
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
