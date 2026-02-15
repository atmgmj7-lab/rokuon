import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config();

async function migrateV10() {
  const dbUrl = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!dbUrl || !authToken) {
    console.error("❌ エラー: 環境変数が設定されていません");
    process.exit(1);
  }

  console.log("🔌 Tursoデータベースに接続中...");
  
  const client = createClient({
    url: dbUrl,
    authToken: authToken,
  });

  try {
    // script_itemsにtarget_situation_idとtrigger_check_item_idを追加
    console.log("📝 script_itemsテーブルを拡張中...");
    
    try {
      await client.execute(
        "ALTER TABLE script_items ADD COLUMN target_situation_id TEXT"
      );
      console.log("✓ target_situation_id カラムを追加しました");
    } catch (e: any) {
      if (e.message.includes("duplicate column name")) {
        console.log("⚠️ target_situation_id カラムは既に存在します");
      } else {
        throw e;
      }
    }

    try {
      await client.execute(
        "ALTER TABLE script_items ADD COLUMN trigger_check_item_id TEXT"
      );
      console.log("✓ trigger_check_item_id カラムを追加しました");
    } catch (e: any) {
      if (e.message.includes("duplicate column name")) {
        console.log("⚠️ trigger_check_item_id カラムは既に存在します");
      } else {
        throw e;
      }
    }

    // item_typeの値を更新（base_scenario → main_scenario）
    console.log("📝 item_typeの値を更新中...");
    await client.execute(
      "UPDATE script_items SET item_type = 'main_scenario' WHERE item_type = 'base_scenario' OR item_type IS NULL"
    );
    console.log("✓ item_typeを更新しました");

    // インデックスを作成
    console.log("📝 インデックスを作成中...");
    await client.execute(`
      CREATE INDEX IF NOT EXISTS idx_script_items_target_situation 
      ON script_items(target_situation_id)
    `);
    await client.execute(`
      CREATE INDEX IF NOT EXISTS idx_script_items_trigger_check 
      ON script_items(trigger_check_item_id)
    `);
    console.log("✓ インデックスを作成しました");

    // デフォルトの「基本シナリオ」トークを1つ作成（サンプル）
    console.log("📝 基本シナリオのサンプルを作成中...");
    const now = Date.now();
    const folderId = "folder_main_scenario";
    
    // フォルダが存在しない場合は作成
    try {
      await client.execute({
        sql: "INSERT INTO script_folders (id, category_id, name, folder_type, sort_order, is_visible_in_sidebar, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        args: [folderId, "cat_main", "基本シナリオ", "base_talk", 0, 1, now, now],
      });
      console.log("✓ 基本シナリオフォルダを作成しました");
    } catch (e: any) {
      if (e.message.includes("UNIQUE constraint")) {
        console.log("⚠️ 基本シナリオフォルダは既に存在します");
      }
    }

    // サンプルトークを作成
    const sampleTalkId = `item_main_${now}`;
    try {
      await client.execute({
        sql: `INSERT INTO script_items (
          id, folder_id, title, hearing_purpose, content, strategy_note, 
          item_type, is_quick_response, sort_order, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          sampleTalkId,
          folderId,
          "【代表突破】時間確認と挨拶",
          "相手の時間的余裕を確認し、警戒を解く",
          "お世話になっております、〇〇株式会社の〇〇と申します。\n今、2-3分ほどお時間よろしいでしょうか？",
          "具体的な時間を提示することで、相手は「それくらいなら...」と思いやすい。\n丁寧だが短く、時間を取らせない印象を与える。",
          "main_scenario",
          0,
          0,
          now,
          now,
        ],
      });
      console.log("✓ 基本シナリオのサンプルトークを作成しました");
    } catch (e: any) {
      if (e.message.includes("UNIQUE constraint")) {
        console.log("⚠️ サンプルトークは既に存在します");
      }
    }

    console.log("✅ V10マイグレーションが正常に完了しました！");
    console.log("\n💡 次のステップ:");
    console.log("1. ワークスペースV2で状況タグを作成");
    console.log("2. 部品トークを作成し、状況タグやチェック項目に紐付け");
    console.log("3. コール画面V2で動的な展開を体験");
  } catch (error) {
    console.error("❌ マイグレーションエラー:", error);
    process.exit(1);
  } finally {
    client.close();
  }
}

migrateV10();
