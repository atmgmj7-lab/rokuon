"""
アポヒアリング API - Turso DB から取得

GET /hearing: カテゴリとヒアリング項目を取得
- ワークスペースで作成したアポヒアリングデータを拡張機能に提供
"""
import os
from fastapi import APIRouter, HTTPException

router = APIRouter()


def _get_db():
    """Turso DB クライアントを取得"""
    url = os.getenv("TURSO_DATABASE_URL")
    token = os.getenv("TURSO_AUTH_TOKEN")
    if not url or not token:
        raise HTTPException(status_code=503, detail="データベースが設定されていません")
    if url.startswith("libsql://"):
        url = url.replace("libsql://", "https://", 1)
    from libsql_client import create_client_sync
    return create_client_sync(url=url, auth_token=token)


@router.get("")
@router.get("/")  # 末尾スラッシュ対応
async def get_hearing():
    """
    アポヒアリングのカテゴリと項目を取得。
    - categories: カテゴリ一覧
    - items_by_category: カテゴリIDをキーにしたヒアリング項目の配列
    """
    try:
        client = _get_db()
        try:
            cat_result = client.execute(
                "SELECT id, name, sort_order FROM hearing_categories ORDER BY sort_order ASC, created_at ASC"
            )
            item_result = client.execute(
                "SELECT id, category_id, title, content, sort_order FROM hearing_items ORDER BY category_id, sort_order ASC, created_at ASC"
            )

            cat_rows = cat_result.rows if hasattr(cat_result, "rows") else list(cat_result)
            item_rows = item_result.rows if hasattr(item_result, "rows") else list(item_result)

            categories = [
                {"id": r[0], "name": r[1], "sort_order": r[2] or 0}
                for r in cat_rows
            ]
            items_by_category = {}
            for r in item_rows:
                cid = r[1]
                if cid not in items_by_category:
                    items_by_category[cid] = []
                items_by_category[cid].append({
                    "id": r[0],
                    "title": r[2] or "",
                    "content": r[3] or "",
                })

            return {
                "categories": categories,
                "items_by_category": items_by_category,
            }
        finally:
            if hasattr(client, "close"):
                client.close()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
