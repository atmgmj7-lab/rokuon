/**
 * migrate-v21: region_keywords テーブルの作成
 *
 * 実行コマンド:
 *   npm run migrate:region-keywords
 *
 * 設計意図:
 *   regions テーブル  → 人口・読み仮名などの地域マスタデータ（安定）
 *   region_keywords   → 業種キーワード×地域の月間検索ボリューム（動的）
 *
 * region_keywords CSVフォーマット:
 *   prefecture,city,keyword,search_volume
 */
import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config();

async function migrateV21() {
  const dbUrl = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!dbUrl || !authToken) {
    console.error("❌ TURSO_DATABASE_URL と TURSO_AUTH_TOKEN を .env に設定してください");
    process.exit(1);
  }

  const client = createClient({ url: dbUrl, authToken });

  try {
    console.log("📝 region_keywords テーブルを作成中...");
    await client.execute(`
      CREATE TABLE IF NOT EXISTS region_keywords (
        id TEXT PRIMARY KEY,
        prefecture TEXT NOT NULL,
        city TEXT NOT NULL,
        keyword TEXT NOT NULL,
        search_volume INTEGER,
        updated_at INTEGER NOT NULL
      )
    `);
    console.log("✓ region_keywords テーブルを作成しました");

    console.log("📝 インデックスを作成中...");
    try {
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_region_keywords_city ON region_keywords(city)"
      );
      await client.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_region_keywords_city_keyword ON region_keywords(prefecture, city, keyword)"
      );
      console.log("✓ インデックスを作成しました");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("already exists") || msg.includes("duplicate")) {
        console.log("⚠️ インデックスは既に存在します");
      } else {
        throw e;
      }
    }

    console.log("\n✅ migrate-v21 (region_keywords) 完了");
  } catch (error) {
    console.error("❌ マイグレーションエラー:", error);
    process.exit(1);
  } finally {
    client.close();
  }
}

migrateV21();
