import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config();

async function migrateV4() {
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
    // script_categoriesテーブルを作成
    console.log("📝 script_categoriesテーブルを作成中...");
    await client.execute(`
      CREATE TABLE IF NOT EXISTS script_categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        created_at INTEGER NOT NULL
      )
    `);
    console.log("✓ script_categoriesテーブルを作成しました");

    // script_foldersテーブルを作成
    console.log("📝 script_foldersテーブルを作成中...");
    await client.execute(`
      CREATE TABLE IF NOT EXISTS script_folders (
        id TEXT PRIMARY KEY,
        category_id TEXT NOT NULL,
        name TEXT NOT NULL,
        folder_type TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (category_id) REFERENCES script_categories(id) ON DELETE CASCADE
      )
    `);
    console.log("✓ script_foldersテーブルを作成しました");

    // script_itemsテーブルを作成
    console.log("📝 script_itemsテーブルを作成中...");
    await client.execute(`
      CREATE TABLE IF NOT EXISTS script_items (
        id TEXT PRIMARY KEY,
        folder_id TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        strategy_note TEXT,
        next_move_hint TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (folder_id) REFERENCES script_folders(id) ON DELETE CASCADE
      )
    `);
    console.log("✓ script_itemsテーブルを作成しました");

    // インデックスを作成
    console.log("📝 インデックスを作成中...");
    
    const indexes = [
      "CREATE INDEX IF NOT EXISTS idx_script_folders_category ON script_folders(category_id)",
      "CREATE INDEX IF NOT EXISTS idx_script_items_folder ON script_items(folder_id)",
      "CREATE INDEX IF NOT EXISTS idx_script_folders_sort ON script_folders(sort_order)",
      "CREATE INDEX IF NOT EXISTS idx_script_items_sort ON script_items(sort_order)",
    ];

    for (const indexSql of indexes) {
      await client.execute(indexSql);
      console.log(`✓ インデックスを作成: ${indexSql.substring(0, 60)}...`);
    }

    console.log("✅ V4マイグレーションが正常に完了しました！");
  } catch (error) {
    console.error("❌ マイグレーションエラー:", error);
    process.exit(1);
  } finally {
    client.close();
  }
}

migrateV4();
