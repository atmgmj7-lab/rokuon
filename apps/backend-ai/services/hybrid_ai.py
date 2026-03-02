"""
Hybrid AI Logic

1. Gemma 3 (Ollama) でWeb情報をクリーニング
2. Gemini 1.5 Pro / GPT-4o で差しどころと戦略を生成
"""
import asyncio
import os
import httpx
from typing import Optional


# Ollama モデル優先順位（gemma3:4b は将来対応、現行は gemma2 系）
_OLLAMA_MODELS = ["gemma3:4b", "gemma3:12b", "gemma2:4b", "gemma2:2b", "gemma2:2b-instruct"]


async def clean_with_gemma(raw_text: str) -> str:
    """Ollama Gemma 3 / Gemma 2 でWeb情報をクリーニング（ノイズ除去・要約）"""
    ollama_host = os.getenv("OLLAMA_HOST", "http://localhost:11434")
    preferred = os.getenv("OLLAMA_MODEL", "").strip()
    models = [preferred] + _OLLAMA_MODELS if preferred else _OLLAMA_MODELS
    models = [m for m in models if m]

    prompt = f"""以下のWebスクレイピング結果から、営業に有用な情報のみを抽出し、簡潔にまとめてください。
不要な広告・ナビゲーション・重複は削除し、企業の特徴・業種・所在地・評判・強みなどに絞ってください。

## 入力
{raw_text[:8000]}

## 出力（要約のみ、箇条書き可）
"""

    for model in models:
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                r = await client.post(
                    f"{ollama_host}/api/generate",
                    json={"model": model, "prompt": prompt, "stream": False},
                )
                r.raise_for_status()
                data = r.json()
                return data.get("response", raw_text[:4000])
        except Exception:
            continue

    return None  # Ollama未起動時は None を返し、生テキストは渡さない


async def generate_strategy_with_cloud(
    web_summary: str,
    knowledge_context: Optional[str] = None,
    industry: Optional[str] = None,
) -> dict:
    """Gemini 1.5 Pro / GPT-4o で差しどころと戦略を生成"""
    api_key = os.getenv("GOOGLE_AI_API_KEY") or os.getenv("GEMINI_API_KEY")
    if api_key:
        return await _generate_with_gemini(web_summary, knowledge_context, api_key, industry)

    api_key = os.getenv("OPENAI_API_KEY")
    if api_key:
        return await _generate_with_openai(web_summary, knowledge_context, api_key, industry)

    return {
        "map_rank": "",
        "sashi_dokoro": ["クラウドAPI未設定。GOOGLE_AI_API_KEY または OPENAI_API_KEY を設定してください"],
        "strategy": "APIキーを設定すると、差しどころと戦略が自動生成されます。",
        "proposal_talk": [],
    }


# Gemini 優先順位: Pro > Flash（差しどころ・戦略は高品質を優先）
_GEMINI_MODELS = ["gemini-1.5-pro", "gemini-1.5-pro-latest", "gemini-1.5-flash", "gemini-2.0-flash"]


async def _generate_with_gemini(
    web_summary: str,
    knowledge_context: Optional[str],
    api_key: str,
    industry: Optional[str] = None,
) -> dict:
    import google.generativeai as genai

    genai.configure(api_key=api_key)
    preferred = os.getenv("GEMINI_STRATEGY_MODEL", "").strip()
    models = [preferred] + _GEMINI_MODELS if preferred else _GEMINI_MODELS
    models = [m for m in models if m]

    context = knowledge_context or "（過去の指導資産なし）"
    industry_note = f"\n## 業種・競合比較の観点\nターゲット業種は「{industry}」です。この業種における競合他社との比較を意識し、差別化できる差しどころを重点的に抽出してください。\n" if industry else ""
    prompt = f"""あなたはテレアポ営業のプロです。以下の情報を元に、営業先への「差しどころ」と「戦略」を生成してください。{industry_note}

## Web解析サマリー
{web_summary}

## 過去の指導資産（RAG）
{context}

## 出力形式（JSON）
{{
  "map_rank": "Google Mapsでの推定順位・露出度（例: 上位表示、口コミ多数など）",
  "sashi_dokoro": ["差しどころ1", "差しどころ2", "差しどころ3"],
  "strategy": "具体的なアプローチ戦略（200字程度）",
  "proposal_talk": ["具体的な提案トーク1", "具体的な提案トーク2"]
}}
"""
    import json
    import re

    for model_name in models:
        try:
            model = genai.GenerativeModel(model_name)
            if hasattr(model, "generate_content_async"):
                response = await model.generate_content_async(prompt)
            else:
                response = await asyncio.to_thread(model.generate_content, prompt)
            text = response.text
            m = re.search(r"\{[\s\S]*\}", text)
            if m:
                return json.loads(m.group())
        except Exception:
            continue

    return {
        "map_rank": "",
        "sashi_dokoro": ["Gemini API呼び出しに失敗しました。モデル・APIキーを確認してください"],
        "strategy": "",
        "proposal_talk": [],
    }


async def _generate_with_openai(
    web_summary: str,
    knowledge_context: Optional[str],
    api_key: str,
    industry: Optional[str] = None,
) -> dict:
    import json
    import re

    context = knowledge_context or "（過去の指導資産なし）"
    industry_note = f"\n## 業種・競合比較の観点\nターゲット業種は「{industry}」です。この業種における競合他社との比較を意識し、差別化できる差しどころを重点的に抽出してください。\n" if industry else ""
    prompt = f"""あなたはテレアポ営業のプロです。以下の情報を元に、営業先への「差しどころ」と「戦略」を生成してください。{industry_note}

## Web解析サマリー
{web_summary}

## 過去の指導資産（RAG）
{context}

## 出力形式（JSON）
{{
  "map_rank": "Google Mapsでの推定順位・露出度（例: 上位表示、口コミ多数など）",
  "sashi_dokoro": ["差しどころ1", "差しどころ2", "差しどころ3"],
  "strategy": "具体的なアプローチ戦略（200字程度）",
  "proposal_talk": ["具体的な提案トーク1", "具体的な提案トーク2"]
}}
"""

    # GPT-4o 優先、フォールバックで gpt-4o-mini
    openai_models = ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"]
    preferred = os.getenv("OPENAI_STRATEGY_MODEL", "").strip()
    if preferred:
        openai_models = [preferred] + openai_models

    for model_name in openai_models:
        try:
            async with httpx.AsyncClient(timeout=25.0) as client:
                r = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {api_key}"},
                    json={
                        "model": model_name,
                        "messages": [{"role": "user", "content": prompt}],
                    },
                )
                r.raise_for_status()
                data = r.json()
                content = data["choices"][0]["message"]["content"]
                m = re.search(r"\{[\s\S]*\}", content)
                if m:
                    return json.loads(m.group())
        except Exception:
            continue

    return {
        "map_rank": "",
        "sashi_dokoro": ["OpenAI API呼び出しに失敗しました。APIキー・モデルを確認してください"],
        "strategy": "",
        "proposal_talk": [],
    }
