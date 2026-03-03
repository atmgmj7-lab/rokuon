/**
 * migrate-v20: regions テーブルの作成
 *
 * 実行コマンド:
 *   npm run migrate:regions
 * または
 *   npx tsx scripts/migrate-v20-regions.ts
 *
 * 追加内容:
 * - regions: 地域データ（都道府県・市区町村・読み仮名・人口・検索ボリューム）
 *   - prefecture + city で一意制約（重複インポート時は UPDATE）
 */
import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config();

async function migrateV20() {
  const dbUrl = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!dbUrl || !authToken) {
    console.error("❌ エラー: TURSO_DATABASE_URL と TURSO_AUTH_TOKEN を .env に設定してください");
    process.exit(1);
  }

  const client = createClient({ url: dbUrl, authToken });

  try {
    console.log("📝 regions テーブルを作成中...");
    await client.execute(`
      CREATE TABLE IF NOT EXISTS regions (
        id TEXT PRIMARY KEY,
        prefecture TEXT NOT NULL,
        city TEXT NOT NULL,
        yomigana TEXT,
        population INTEGER,
        search_volume INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);
    console.log("✓ regions テーブルを作成しました");

    console.log("📝 インデックスを作成中...");
    try {
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_regions_prefecture ON regions(prefecture)"
      );
      await client.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_regions_prefecture_city ON regions(prefecture, city)"
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

    console.log("\n✅ migrate-v20 (regions) 完了");
  } catch (error) {
    console.error("❌ マイグレーションエラー:", error);
    process.exit(1);
  } finally {
    client.close();
  }
}

migrateV20();
