import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config();

async function migrateV7() {
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
    // script_itemsテーブルにhearing_purposeカラムを追加
    console.log("📝 script_itemsテーブルにhearing_purposeカラムを追加中...");
    
    try {
      await client.execute(
        "ALTER TABLE script_items ADD COLUMN hearing_purpose TEXT"
      );
      console.log("✓ hearing_purpose カラムを追加しました");
    } catch (e: any) {
      if (e.message.includes("duplicate column name")) {
        console.log("⚠️ hearing_purpose カラムは既に存在します");
      } else {
        throw e;
      }
    }

    // item_responsesテーブルを作成（顧客の返答による分岐管理）
    console.log("📝 item_responsesテーブルを作成中...");
    await client.execute(`
      CREATE TABLE IF NOT EXISTS item_responses (
        id TEXT PRIMARY KEY,
        parent_item_id TEXT NOT NULL,
        response_text TEXT NOT NULL, -- 顧客の返答例（例：「高い」「必要ない」「興味ある」）
        next_item_id TEXT, -- この返答が来た際に展開する次のトークID（NULLの場合は終了）
        sort_order INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (parent_item_id) REFERENCES script_items(id) ON DELETE CASCADE,
        FOREIGN KEY (next_item_id) REFERENCES script_items(id) ON DELETE SET NULL
      )
    `);
    console.log("✓ item_responsesテーブルを作成しました");

    // インデックスを作成
    console.log("📝 インデックスを作成中...");
    await client.execute(`
      CREATE INDEX IF NOT EXISTS idx_item_responses_parent 
      ON item_responses(parent_item_id, sort_order)
    `);
    console.log("✓ インデックスを作成しました");

    console.log("✅ V7マイグレーションが正常に完了しました！");
  } catch (error) {
    console.error("❌ マイグレーションエラー:", error);
    process.exit(1);
  } finally {
    client.close();
  }
}

migrateV7();
