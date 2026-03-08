/**
 * migrate-v25: script_items に audio_url・r2_key を追加（ワークスペース上での音声録音対応）
 *
 * 実行例:
 *   npx tsx scripts/migrate-v25-script-audio.ts
 */
import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

async function migrateV25() {
  const dbUrl = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!dbUrl || !authToken) {
    console.error("❌ エラー: TURSO_DATABASE_URL と TURSO_AUTH_TOKEN を .env に設定してください");
    process.exit(1);
  }

  const client = createClient({ url: dbUrl, authToken });

  try {
    console.log("📝 script_items に audio_url を追加中...");
    try {
      await client.execute("ALTER TABLE script_items ADD COLUMN audio_url TEXT");
      console.log("✓ audio_url カラムを追加しました");
    } catch (e) {
      console.log("⚠️ audio_url は既に存在する可能性があります:", e instanceof Error ? e.message : String(e));
    }

    console.log("📝 script_items に r2_key を追加中...");
    try {
      await client.execute("ALTER TABLE script_items ADD COLUMN r2_key TEXT");
      console.log("✓ r2_key カラムを追加しました");
    } catch (e) {
      console.log("⚠️ r2_key は既に存在する可能性があります:", e instanceof Error ? e.message : String(e));
    }

    console.log("\n✅ migrate-v25 (script_items audio) 完了");
  } catch (error) {
    console.error("❌ マイグレーションエラー:", error);
    process.exit(1);
  } finally {
    client.close();
  }
}

migrateV25();
