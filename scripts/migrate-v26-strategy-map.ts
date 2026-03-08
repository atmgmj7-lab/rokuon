/**
 * migrate-v26: 戦略マップ強化
 *   - mind_maps に persona_data (JSON) を追加
 *   - map_nodes に bg_color, border_width を追加
 *   - map_edges に edge_color, edge_width を追加
 *
 * 実行例:
 *   npx tsx scripts/migrate-v26-strategy-map.ts
 */
import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

async function migrateV26() {
  const dbUrl    = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!dbUrl || !authToken) {
    console.error("❌ TURSO_DATABASE_URL と TURSO_AUTH_TOKEN を .env に設定してください");
    process.exit(1);
  }

  const client = createClient({ url: dbUrl, authToken });

  const run = async (label: string, sql: string) => {
    try {
      await client.execute(sql);
      console.log(`✓ ${label}`);
    } catch (e) {
      console.log(`⚠️  ${label} (既に存在する可能性): ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  try {
    console.log("📝 mind_maps に persona_data を追加中...");
    await run("mind_maps.persona_data", "ALTER TABLE mind_maps ADD COLUMN persona_data TEXT");

    console.log("📝 map_nodes にスタイル列を追加中...");
    await run("map_nodes.bg_color", "ALTER TABLE map_nodes ADD COLUMN bg_color TEXT DEFAULT '#FFFFFF'");
    await run("map_nodes.border_width", "ALTER TABLE map_nodes ADD COLUMN border_width REAL DEFAULT 1");

    console.log("📝 map_edges にスタイル列を追加中...");
    await run("map_edges.edge_color", "ALTER TABLE map_edges ADD COLUMN edge_color TEXT");
    await run("map_edges.edge_width", "ALTER TABLE map_edges ADD COLUMN edge_width REAL");

    console.log("\n✅ migrate-v26 (strategy map) 完了");
  } catch (error) {
    console.error("❌ マイグレーションエラー:", error);
    process.exit(1);
  } finally {
    client.close();
  }
}

migrateV26();
