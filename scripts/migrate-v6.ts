import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config();

async function migrateV6() {
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
    // situation_tagsテーブルを作成
    console.log("📝 situation_tagsテーブルを作成中...");
    await client.execute(`
      CREATE TABLE IF NOT EXISTS situation_tags (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL, -- '相手の反応', 'Web状況', '属性' など
        description TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL
      )
    `);
    console.log("✓ situation_tagsテーブルを作成しました");

    // item_situations中間テーブルを作成
    console.log("📝 item_situations中間テーブルを作成中...");
    await client.execute(`
      CREATE TABLE IF NOT EXISTS item_situations (
        id TEXT PRIMARY KEY,
        item_id TEXT NOT NULL,
        situation_tag_id TEXT NOT NULL,
        priority INTEGER DEFAULT 0, -- この状況でのこのトークの優先度
        created_at INTEGER NOT NULL,
        FOREIGN KEY (item_id) REFERENCES script_items(id) ON DELETE CASCADE,
        FOREIGN KEY (situation_tag_id) REFERENCES situation_tags(id) ON DELETE CASCADE
      )
    `);
    console.log("✓ item_situationsテーブルを作成しました");

    // インデックスを作成
    console.log("📝 インデックスを作成中...");
    await client.execute(`
      CREATE INDEX IF NOT EXISTS idx_situation_tags_category 
      ON situation_tags(category, sort_order)
    `);
    await client.execute(`
      CREATE INDEX IF NOT EXISTS idx_item_situations_item 
      ON item_situations(item_id)
    `);
    await client.execute(`
      CREATE INDEX IF NOT EXISTS idx_item_situations_tag 
      ON item_situations(situation_tag_id)
    `);
    console.log("✓ インデックスを作成しました");

    console.log("✅ V6マイグレーションが正常に完了しました！");
  } catch (error) {
    console.error("❌ マイグレーションエラー:", error);
    process.exit(1);
  } finally {
    client.close();
  }
}

migrateV6();
