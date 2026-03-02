#!/usr/bin/env python3
"""
トークの混入原因調査 - DBのフォルダ紐付けチェック

全トークの folder_type 紐付け状況を取得し、
部品トークが誤って base_talk に分類されていないか確認する。
"""
from pathlib import Path

from dotenv import load_dotenv

# プロジェクトルートの .env を読み込み
_env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=_env_path)

import os

url = os.getenv("TURSO_DATABASE_URL")
token = os.getenv("TURSO_AUTH_TOKEN")

if not url or not token:
    print("❌ TURSO_DATABASE_URL または TURSO_AUTH_TOKEN が未設定です")
    exit(1)

# WebSocket 505 エラー回避
if url.startswith("libsql://"):
    url = url.replace("libsql://", "https://", 1)

print("=" * 60)
print("トークのフォルダ紐付け調査")
print("=" * 60)

try:
    from libsql_client import create_client_sync

    client = create_client_sync(url=url, auth_token=token)

    result = client.execute(
        """
        SELECT i.title, f.name AS folder_name, f.folder_type
        FROM script_items i
        JOIN script_folders f ON i.folder_id = f.id
        ORDER BY f.folder_type, f.name, i.sort_order
        """
    )
    rows = result.rows if hasattr(result, "rows") else list(result)

    print(f"\n取得件数: {len(rows)} 件\n")
    print(f"{'title':<40} | {'folder_name':<20} | folder_type")
    print("-" * 80)

    base_talk_items = []
    situational_items = []
    component_talk_titles = ["集客困っていない", "忙しい", "予算がない", "インバウンドトーク", "Googleマップ写真更新トーク"]

    for row in rows:
        title = (row[0] or "").strip()[:38]
        folder_name = (row[1] or "").strip()[:18]
        folder_type = (row[2] or "").strip()
        print(f"{title:<40} | {folder_name:<20} | {folder_type}")

        if folder_type == "base_talk":
            base_talk_items.append((row[0] or "", folder_name))
        else:
            situational_items.append((row[0] or "", folder_name))

    if hasattr(client, "close"):
        client.close()

    # 部品トークの誤分類チェック
    print("\n" + "=" * 60)
    print("【部品トークの誤分類チェック】")
    print("=" * 60)

    misclassified = []
    for full_title, folder_name in base_talk_items:
        title_str = (full_title or "").strip()
        for kw in component_talk_titles:
            if kw in title_str:
                misclassified.append((title_str, folder_name, "base_talk"))

    if misclassified:
        print("\n⚠️ 以下のトークは「部品トーク」の可能性が高いが、base_talk フォルダに紐付いています:")
        for title, folder, ft in misclassified:
            print(f"  - {title[:50]}... (folder: {folder}, type: {ft})")
        print("\n【提案】")
        print("  1. ワークスペース側で、該当トークを「部品トーク」用フォルダ（folder_type=situational）に移動してください。")
        print("  2. または、手動でDBを修正: script_folders の folder_type を確認し、")
        print("     script_items の folder_id を situational フォルダの id に更新してください。")
    else:
        print("\n✓ 明らかな部品トークの誤分類は検出されませんでした。")
        print("  （「集客困っていない」等のキーワードが base_talk に含まれているトークはありません）")

    print("\n【サマリ】")
    print(f"  base_talk に属するトーク: {len(base_talk_items)} 件")
    print(f"  situational に属するトーク: {len(situational_items)} 件")
    print("\n✅ 調査完了")

except Exception as e:
    print(f"❌ エラー: {e}")
    import traceback
    traceback.print_exc()
    exit(1)
