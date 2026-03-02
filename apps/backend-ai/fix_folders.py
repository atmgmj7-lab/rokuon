#!/usr/bin/env python3
"""
既存データ修正: base_talk に誤紐付けされた部品トークを situational フォルダへ移動

対象トーク: 集客困っていない, 新しいトーク, Googleマップ写真更新トーク, インバウンドトーク_4つの質問 等
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

# 部品トークとして situational へ移動するタイトル（調査結果に基づく）
# 完全一致または部分一致で判定
COMPONENT_TALK_TITLES = {
    "集客困っていない",
    "新しいトーク",
    "分岐先トーク",
    "Googleマップ写真更新トーク",
    "インバウンドトーク_4つの質問",
}
COMPONENT_TALK_KEYWORDS = [
    "集客困っていない",
    "インバウンドトーク",
    "忙しい",
    "予算がない",
    "Googleマップ",
    "写真更新",
]

def is_component_talk(title: str) -> bool:
    """部品トークと判定するか"""
    t = (title or "").strip()
    if t in COMPONENT_TALK_TITLES:
        return True
    for kw in COMPONENT_TALK_KEYWORDS:
        if kw in t:
            return True
    return False

def main():
    from libsql_client import create_client_sync

    client = create_client_sync(url=url, auth_token=token)

    try:
        # situational フォルダを取得（なければ作成）
        folders_result = client.execute(
            "SELECT id, name FROM script_folders WHERE folder_type = 'situational' ORDER BY sort_order ASC LIMIT 1"
        )
        folders_rows = folders_result.rows if hasattr(folders_result, "rows") else list(folders_result)

        situational_folder_id = None
        if folders_rows:
            situational_folder_id = folders_rows[0][0]
            print(f"✓ situational フォルダ: {folders_rows[0][1]} (id={situational_folder_id})")
        else:
            # 作成: カテゴリを1件取得し、situational フォルダを作成
            cat_result = client.execute("SELECT id FROM script_categories ORDER BY created_at ASC LIMIT 1")
            cat_rows = cat_result.rows if hasattr(cat_result, "rows") else list(cat_result)
            if not cat_rows:
                print("❌ script_categories が空です。先にカテゴリを作成してください。")
                exit(1)
            category_id = cat_rows[0][0]
            new_folder_id = f"folder_{int(__import__('time').time() * 1000)}"
            now = int(__import__('time').time() * 1000)
            client.execute(
                """
                INSERT INTO script_folders (id, category_id, name, folder_type, sort_order, is_visible_in_sidebar, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                [new_folder_id, category_id, "質問への回答", "situational", 100, 1, now],
            )
            situational_folder_id = new_folder_id
            print(f"✓ situational フォルダを新規作成: 質問への回答 (id={situational_folder_id})")

        # base_talk に紐づく全アイテムを取得
        items_result = client.execute(
            """
            SELECT si.id, si.title, sf.id as folder_id
            FROM script_items si
            JOIN script_folders sf ON si.folder_id = sf.id
            WHERE sf.folder_type = 'base_talk'
            """
        )
        items_rows = items_result.rows if hasattr(items_result, "rows") else list(items_result)
        print(f"base_talk に紐づくアイテム: {len(items_rows)} 件")

        moved = 0
        for row in items_rows:
            item_id, title, _ = row[0], (row[1] or "").strip(), row[2]
            is_comp = is_component_talk(title)
            if is_comp:
                now_ts = int(__import__("time").time() * 1000)
                client.execute(
                    "UPDATE script_items SET folder_id = ?, updated_at = ? WHERE id = ?",
                    [situational_folder_id, now_ts, item_id],
                )
                print(f"  移動: {title[:40]}... (id={item_id})")
                moved += 1

        if hasattr(client, "close"):
            client.close()

        print(f"\n✅ {moved} 件を situational フォルダへ移動しました")

    except Exception as e:
        print(f"❌ エラー: {e}")
        import traceback
        traceback.print_exc()
        exit(1)

if __name__ == "__main__":
    main()
