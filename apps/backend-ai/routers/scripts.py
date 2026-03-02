"""
トークスクリプト API - Turso DB と同期

GET /scripts: 基本シナリオと部品トークを取得
- base_scenarios: folder_type='base_talk' のアイテム
- component_talks: folder_type='situational' のアイテム（script_items.category_id → categories.name でグループ化）
- user_id クエリ: 指定時は user_script_selections で is_visible=0 のトークを除外
"""
import logging
import os
from collections import defaultdict
from fastapi import APIRouter, HTTPException, Query

logger = logging.getLogger(__name__)
router = APIRouter()

# 拡張機能用: ルート直下 /scripts で応答（prefix に依存しない）
SCRIPTS_PATH = "/scripts"


def _get_db():
    """Turso DB クライアントを取得"""
    url = os.getenv("TURSO_DATABASE_URL")
    token = os.getenv("TURSO_AUTH_TOKEN")
    if not url or not token:
        raise HTTPException(status_code=503, detail="データベースが設定されていません")
    # WebSocket 505 エラー回避: libsql:// を https:// に置換して HTTP 通信を強制
    if url.startswith("libsql://"):
        url = url.replace("libsql://", "https://", 1)
    from libsql_client import create_client_sync
    return create_client_sync(url=url, auth_token=token)


@router.get(SCRIPTS_PATH)
@router.get(SCRIPTS_PATH + "/")  # 末尾スラッシュ対応
async def get_scripts(user_id: str | None = Query(None, description="ユーザーID（指定時は user_script_selections で非表示を除外）")):
    """
    基本シナリオと部品トークを取得。
    - base_talk → base_scenarios
    - situational → component_talks（script_items.category_id → categories.name でグループ化）
    - user_id 指定時: is_visible=0 のトークを除外（レコードなしは表示）
    """
    try:
        client = _get_db()
        try:
            # script_items.category_id → categories（動的カテゴリ）でグループ化
            # user_script_selections: 明示的に is_visible=0 のものだけ除外（NOT EXISTS で安全にフィルタ）
            # レコードなし = デフォルト表示
            if user_id:
                sql = """
                SELECT
                    si.id,
                    si.title,
                    si.content,
                    sf.folder_type,
                    COALESCE(c.name, '') AS category_name
                FROM script_items si
                JOIN script_folders sf ON si.folder_id = sf.id
                LEFT JOIN categories c ON si.category_id = c.id
                WHERE NOT EXISTS (
                    SELECT 1 FROM user_script_selections uss
                    WHERE uss.script_item_id = si.id AND uss.user_id = ? AND uss.is_visible = 0
                )
                ORDER BY sf.folder_type, c.name, sf.sort_order ASC, si.sort_order ASC
                """
                result = client.execute(sql, [user_id])
            else:
                sql = """
                SELECT
                    si.id,
                    si.title,
                    si.content,
                    sf.folder_type,
                    COALESCE(c.name, '') AS category_name
                FROM script_items si
                JOIN script_folders sf ON si.folder_id = sf.id
                LEFT JOIN categories c ON si.category_id = c.id
                ORDER BY sf.folder_type, c.name, sf.sort_order ASC, si.sort_order ASC
                """
                result = client.execute(sql)

            rows = result.rows if hasattr(result, "rows") else (result.fetch_all() if hasattr(result, "fetch_all") else list(result))

            base_scenarios = []
            component_talks = defaultdict(list)

            for row in rows:
                title = (row[1] or "").strip()
                content = row[2] or ""
                folder_type = row[3] or ""
                category_name = (row[4] or "").strip()

                if folder_type == "base_talk":
                    if title:
                        base_scenarios.append({"title": title, "content": content})
                elif folder_type == "situational":
                    key = category_name or "未分類"
                    if title:
                        component_talks[key].append({"title": title, "content": content})

            base_count = len(base_scenarios)
            comp_count = sum(len(v) for v in component_talks.values())
            total = base_count + comp_count
            msg = f"[scripts] user_id={user_id or '(none)'} base_scenarios={base_count} component_talks={comp_count} total={total}"
            logger.info(msg)
            print(msg)

            return {
                "base_scenarios": base_scenarios,
                "component_talks": dict(component_talks),
            }
        finally:
            if hasattr(client, "close"):
                client.close()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
