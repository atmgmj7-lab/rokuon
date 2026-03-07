/**
 * migrate-v23: map_nodes に parent_id を追加（ツリー/アウトライン用）
 *
 * 実行例:
 *   npx tsx scripts/migrate-v23-mind-maps-parent-id.ts
 */
import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

async function migrateV23() {
  const dbUrl = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!dbUrl || !authToken) {
    console.error("❌ エラー: TURSO_DATABASE_URL と TURSO_AUTH_TOKEN を .env に設定してください");
    process.exit(1);
  }

  const client = createClient({ url: dbUrl, authToken });

  try {
    console.log("🧩 map_nodes に parent_id を追加中...");
    try {
      await client.execute("ALTER TABLE map_nodes ADD COLUMN parent_id TEXT");
      console.log("✓ parent_id カラムを追加しました");
    } catch (e) {
      console.log("⚠️ parent_id カラムは既に存在する可能性があります:", e instanceof Error ? e.message : String(e));
    }

    try {
      await client.execute("CREATE INDEX IF NOT EXISTS idx_map_nodes_parent_id ON map_nodes(parent_id)");
      console.log("✓ idx_map_nodes_parent_id を作成しました");
    } catch (e) {
      console.log("⚠️ インデックス作成をスキップ:", e instanceof Error ? e.message : String(e));
    }

    console.log("\n✅ migrate-v23 (mind_maps parent_id) 完了");
  } catch (error) {
    console.error("❌ マイグレーションエラー:", error);
    process.exit(1);
  } finally {
    client.close();
  }
}

migrateV23();

