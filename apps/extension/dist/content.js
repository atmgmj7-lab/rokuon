/**
 * Content Script: 地域・URL を抽出し Side Panel に送る
 * - 選択テキスト: 住所らしき→地域
 * - 現在ページのURL → ターゲットURL候補
 * - ページ内の「〇〇県〇〇市」等→地域
 */
(function () {
  const REGION_PATTERNS = [
    /(?:東京都|北海道|(?:京都|大阪)府|.{2,3}県)(?:[^\s、。！？\n]{2,20}(?:区|市|町|村))?/g,
    /[^\s、。！？\n]{2,15}(?:区|市|町|村)(?:\s+[^\s、。！？\n]{2,15}(?:区|市|町|村))?/g,
  ];

  function extractFromSelection() {
    const sel = window.getSelection();
    const text = (sel && sel.toString() || "").trim();
    if (text.length < 2 || text.length > 80) return null;
    const isRegion = /(?:県|府|都|区|市|町|村)/.test(text) && !/(?:株式会社|㈱|有限会社)/.test(text);
    return { text, isRegion };
  }

  function extractRegionFromPage() {
    const body = document.body?.innerText || "";
    const candidates = new Set();
    for (const re of REGION_PATTERNS) {
      let m;
      re.lastIndex = 0;
      while ((m = re.exec(body)) !== null) {
        const s = m[0].trim();
        if (s.length >= 3 && s.length <= 40) candidates.add(s);
      }
    }
    return Array.from(candidates).slice(0, 3);
  }

  function send(type, value) {
    if (typeof chrome !== "undefined" && chrome.runtime?.id) {
      chrome.runtime.sendMessage({ type, value });
    }
  }

  function runExtraction() {
    const sel = extractFromSelection();
    if (sel && sel.isRegion) {
      send("REGION_EXTRACTED", sel.text);
      return;
    }

    const regions = extractRegionFromPage();
    if (regions.length > 0) send("REGION_EXTRACTED", regions[0]);

    if (window.location.href && window.location.href.startsWith("http")) {
      send("URL_EXTRACTED", window.location.href);
    }
  }

  if (document.readyState === "complete") {
    runExtraction();
  } else {
    window.addEventListener("load", runExtraction);
  }

  document.addEventListener("selectionchange", runExtraction);
})();
