/**
 * アポヒアリング用テーブル作成
 * - hearing_categories: ヒアリング専用カテゴリ
 * - hearing_items: ヒアリング項目（カテゴリに紐づく）
 */
import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config();

async function migrateV15() {
  const dbUrl = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!dbUrl || !authToken) {
    console.error("❌ エラー: 環境変数が設定されていません");
    process.exit(1);
  }

  const client = createClient({
    url: dbUrl,
    authToken: authToken,
  });

  try {
    console.log("📝 hearing_categories テーブルを作成中...");
    await client.execute(`
      CREATE TABLE IF NOT EXISTS hearing_categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL
      )
    `);
    console.log("✓ hearing_categories を作成しました");

    console.log("📝 hearing_items テーブルを作成中...");
    await client.execute(`
      CREATE TABLE IF NOT EXISTS hearing_items (
        id TEXT PRIMARY KEY,
        category_id TEXT NOT NULL,
        text TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (category_id) REFERENCES hearing_categories(id) ON DELETE CASCADE
      )
    `);
    console.log("✓ hearing_items を作成しました");

    await client.execute(
      "CREATE INDEX IF NOT EXISTS idx_hearing_items_category ON hearing_items(category_id)"
    );
    console.log("✓ インデックスを作成しました");

    console.log("✅ V15マイグレーション完了");
  } catch (error) {
    console.error("❌ マイグレーションエラー:", error);
    process.exit(1);
  } finally {
    client.close();
  }
}

migrateV15();
