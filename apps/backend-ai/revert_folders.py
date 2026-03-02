#!/usr/bin/env python3
"""
過剰なマイグレーションの修正: 基本シナリオへ切り戻し + 空データ削除

1. 「Googleマップ写真更新トーク」「インバウンドトーク_4つの質問」を base_talk フォルダへ戻す
2. title が空の script_items を削除
"""
from pathlib import Path

from dotenv import load_dotenv

_env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=_env_path)

import os

url = os.getenv("TURSO_DATABASE_URL")
token = os.getenv("TURSO_AUTH_TOKEN")

if not url or not token:
    print("❌ TURSO_DATABASE_URL または TURSO_AUTH_TOKEN が未設定です")
    exit(1)

if url.startswith("libsql://"):
    url = url.replace("libsql://", "https://", 1)

# 基本シナリオへ戻すべきタイトル（完全一致）
BASE_SCENARIO_TITLES = [
    "Googleマップ写真更新トーク",
    "インバウンドトーク_4つの質問",
]


def main():
    from libsql_client import create_client_sync

    client = create_client_sync(url=url, auth_token=token)

    try:
        # 1. base_talk フォルダを取得
        folders_result = client.execute(
            "SELECT id, name FROM script_folders WHERE folder_type = 'base_talk' ORDER BY sort_order ASC LIMIT 1"
        )
        folders_rows = folders_result.rows if hasattr(folders_result, "rows") else list(folders_result)

        if not folders_rows:
            print("❌ base_talk フォルダが見つかりません")
            exit(1)

        base_talk_folder_id = folders_rows[0][0]
        base_talk_folder_name = folders_rows[0][1]
        print(f"✓ base_talk フォルダ: {base_talk_folder_name} (id={base_talk_folder_id})")

        # 2. 基本シナリオへ戻すアイテムを取得して UPDATE
        reverted = 0
        for title in BASE_SCENARIO_TITLES:
            items_result = client.execute(
                "SELECT id, title FROM script_items WHERE title = ?",
                [title],
            )
            items_rows = items_result.rows if hasattr(items_result, "rows") else list(items_result)
            for row in items_rows:
                item_id = row[0]
                now_ts = int(__import__("time").time() * 1000)
                client.execute(
                    "UPDATE script_items SET folder_id = ?, updated_at = ? WHERE id = ?",
                    [base_talk_folder_id, now_ts, item_id],
                )
                print(f"  切り戻し: {title} (id={item_id})")
                reverted += 1

        print(f"\n✅ {reverted} 件を base_talk へ切り戻しました")

        # 3. 空のトーク（title が空 or NULL）を削除
        delete_result = client.execute(
            "SELECT id, title FROM script_items WHERE title = '' OR title IS NULL"
        )
        delete_rows = delete_result.rows if hasattr(delete_result, "rows") else list(delete_result)

        deleted = 0
        for row in delete_rows:
            item_id = row[0]
            client.execute("DELETE FROM script_items WHERE id = ?", [item_id])
            print(f"  削除: 空のトーク (id={item_id})")
            deleted += 1

        if deleted > 0:
            print(f"\n✅ {deleted} 件のゴーストデータを削除しました")
        else:
            print("\n空のトークはありませんでした")

        if hasattr(client, "close"):
            client.close()

        # 4. 確認
        print("\n" + "=" * 60)
        print("【確認】")
        print("=" * 60)
        print("check_mapping.py を実行して紐付けを確認してください:")
        print("  python check_mapping.py")
        print("\nGET /scripts API の期待値:")
        print("  base_scenarios: Googleマップ〜, インバウンド〜")
        print("  component_talks: 集客困っていない, 新しいトーク")

    except Exception as e:
        print(f"❌ エラー: {e}")
        import traceback
        traceback.print_exc()
        exit(1)


if __name__ == "__main__":
    main()
