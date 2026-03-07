/**
 * migrate-v24: map_nodes に title を追加（UIの「タイトル」編集用）
 *
 * 実行例:
 *   npx tsx scripts/migrate-v24-mind-maps-title.ts
 */
import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

async function migrateV24() {
  const dbUrl = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!dbUrl || !authToken) {
    console.error("❌ エラー: TURSO_DATABASE_URL と TURSO_AUTH_TOKEN を .env に設定してください");
    process.exit(1);
  }

  const client = createClient({ url: dbUrl, authToken });

  try {
    console.log("📝 map_nodes に title を追加中...");
    try {
      await client.execute("ALTER TABLE map_nodes ADD COLUMN title TEXT");
      console.log("✓ title カラムを追加しました");
    } catch (e) {
      console.log("⚠️ title カラムは既に存在する可能性があります:", e instanceof Error ? e.message : String(e));
    }

    // 既存データ: title が NULL のものは label をコピー
    try {
      await client.execute("UPDATE map_nodes SET title = label WHERE title IS NULL");
      console.log("✓ 既存ノードの title を label から補完しました");
    } catch (e) {
      console.log("⚠️ 補完をスキップ:", e instanceof Error ? e.message : String(e));
    }

    console.log("\n✅ migrate-v24 (mind_maps title) 完了");
  } catch (error) {
    console.error("❌ マイグレーションエラー:", error);
    process.exit(1);
  } finally {
    client.close();
  }
}

migrateV24();

