#!/usr/bin/env python3
"""
Turso DB データ確認用一時スクリプト
- script_items / script_categories の行数
- 最新1〜2件のテキスト内容を表示
"""
from pathlib import Path

from dotenv import load_dotenv

# プロジェクトルートの .env を読み込み（main.py と同じ）
_env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=_env_path)

import os

url = os.getenv("TURSO_DATABASE_URL")
token = os.getenv("TURSO_AUTH_TOKEN")

if not url or not token:
    print("❌ TURSO_DATABASE_URL または TURSO_AUTH_TOKEN が未設定です")
    print(f"   TURSO_DATABASE_URL: {'設定済' if url else '未設定'}")
    print(f"   TURSO_AUTH_TOKEN: {'設定済' if token else '未設定'}")
    exit(1)

# WebSocket 505 エラー回避: libsql:// を https:// に置換
if url.startswith("libsql://"):
    url = url.replace("libsql://", "https://", 1)

print(f"📌 接続先: {url[:50]}...")
print()

try:
    from libsql_client import create_client_sync

    client = create_client_sync(url=url, auth_token=token)

    def _first_value(result):
        rows = result.rows if hasattr(result, "rows") else (result.fetch_all() if hasattr(result, "fetch_all") else list(result))
        return rows[0][0] if rows else 0

    # script_categories 行数
    cat_result = client.execute("SELECT COUNT(*) FROM script_categories")
    cat_count = _first_value(cat_result)
    print(f"📊 script_categories: {cat_count} 件")

    # script_items 行数
    items_result = client.execute("SELECT COUNT(*) FROM script_items")
    items_count = _first_value(items_result)
    print(f"📊 script_items: {items_count} 件")

    # script_folders 行数（参考）
    folders_result = client.execute("SELECT COUNT(*) FROM script_folders")
    folders_count = _first_value(folders_result)
    print(f"📊 script_folders: {folders_count} 件")
    print()

    # script_items 最新2件
    latest = client.execute(
        """
        SELECT si.id, si.title, si.content, si.created_at
        FROM script_items si
        ORDER BY si.updated_at DESC, si.created_at DESC
        LIMIT 2
        """
    )
    rows = latest.rows if hasattr(latest, "rows") else (latest.fetch_all() if hasattr(latest, "fetch_all") else list(latest))
    print("📝 script_items 最新2件:")
    for i, row in enumerate(rows, 1):
        rid, title, content, created = row[0], row[1], row[2], row[3]
        content_preview = (content or "")[:80].replace("\n", " ") + ("..." if (content or "") and len(content or "") > 80 else "")
        print(f"   [{i}] id={rid}, title={title!r}")
        print(f"       content(先頭80文字): {content_preview!r}")
        print(f"       created_at: {created}")
        print()

    # script_categories 最新2件
    cat_latest = client.execute(
        "SELECT id, name, description FROM script_categories ORDER BY created_at DESC LIMIT 2"
    )
    cat_rows = cat_latest.rows if hasattr(cat_latest, "rows") else (cat_latest.fetch_all() if hasattr(cat_latest, "fetch_all") else list(cat_latest))
    print("📝 script_categories 最新2件:")
    for i, row in enumerate(cat_rows, 1):
        print(f"   [{i}] id={row[0]}, name={row[1]!r}, description={row[2]!r}")

    if hasattr(client, "close"):
        client.close()

    print()
    print("✅ チェック完了")

except Exception as e:
    print(f"❌ エラー: {e}")
    import traceback

    traceback.print_exc()
    exit(1)
