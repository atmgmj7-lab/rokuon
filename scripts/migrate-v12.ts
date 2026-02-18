import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config();

async function migrateV12() {
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
    // user_dictionariesテーブルを作成
    console.log("📝 user_dictionariesテーブルを作成中...");

    await client.execute(`
      CREATE TABLE IF NOT EXISTS user_dictionaries (
        id TEXT PRIMARY KEY,
        term TEXT NOT NULL,
        reading TEXT,
        category TEXT,
        created_at INTEGER NOT NULL
      )
    `);
    console.log("✓ user_dictionariesテーブルを作成しました");

    // インデックスを作成
    try {
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_user_dictionaries_term ON user_dictionaries(term)"
      );
      console.log("✓ idx_user_dictionaries_term インデックスを作成しました");
    } catch (e: any) {
      if (e.message?.includes("already exists")) {
        console.log("⚠️ idx_user_dictionaries_term は既に存在します");
      } else {
        throw e;
      }
    }

    try {
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_user_dictionaries_category ON user_dictionaries(category)"
      );
      console.log("✓ idx_user_dictionaries_category インデックスを作成しました");
    } catch (e: any) {
      if (e.message?.includes("already exists")) {
        console.log("⚠️ idx_user_dictionaries_category は既に存在します");
      } else {
        throw e;
      }
    }

    console.log("✅ V12マイグレーション完了");
  } catch (error) {
    console.error("❌ マイグレーションエラー:", error);
    process.exit(1);
  } finally {
    client.close();
  }
}

migrateV12();
