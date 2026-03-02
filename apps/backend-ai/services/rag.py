"""
RAG: 過去の指導資産（knowledge_base, analysis_results）を取得

Turso DB から関連ナレッジを検索し、コンテキストとして結合。
"""
import asyncio
import json
import os
from typing import Optional


def _fetch_knowledge_sync(query: str, limit: int) -> Optional[str]:
    """同期でDBから取得（asyncio.to_thread で呼び出し）"""
    url = os.getenv("TURSO_DATABASE_URL")
    token = os.getenv("TURSO_AUTH_TOKEN")
    if not url or not token:
        return None

    try:
        from libsql_client import create_client_sync

        # WebSocket 505 エラー回避: libsql:// を https:// に置換して HTTP 通信を強制
        if url.startswith("libsql://"):
            url = url.replace("libsql://", "https://", 1)
        client = create_client_sync(url=url, auth_token=token)

        q = f"%{query}%"
        result = client.execute(
            """
            SELECT title, content, tags
            FROM knowledge_base
            WHERE content LIKE ? OR tags LIKE ? OR title LIKE ?
            ORDER BY usage_count DESC, success_count DESC
            LIMIT ?
            """,
            (q, q, q, limit),
        )
        rows = result.fetch_all() if hasattr(result, "fetch_all") else list(result)

        items = [f"- {r[1]} (tags: {r[2] or ''})" for r in rows]

        ar_result = client.execute(
            "SELECT analysis_data FROM analysis_results ORDER BY created_at DESC LIMIT 5"
        )
        ar_rows = ar_result.fetch_all() if hasattr(ar_result, "fetch_all") else list(ar_result)

        for row in ar_rows:
            try:
                data = json.loads(row[0])
                ak = data.get("actionable_knowledge", [])
                for k in (ak or [])[:3]:
                    items.append(f"- [指導] {k}")
            except Exception:
                pass

        if hasattr(client, "close"):
            client.close()
        return "\n".join(items) if items else None
    except Exception:
        return None


async def get_relevant_knowledge(query: str, limit: int = 5) -> Optional[str]:
    """query に基づき knowledge_base と analysis_results から関連情報を取得"""
    return await asyncio.to_thread(_fetch_knowledge_sync, query, limit)
