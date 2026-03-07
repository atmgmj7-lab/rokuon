/**
 * migrate-v22: マインドマップ関連テーブルの作成
 *
 * 実行コマンド:
 *   npm run migrate:mind-maps
 * または
 *   npx tsx scripts/migrate-v22-mind-maps.ts
 *
 * 追加内容:
 * - mind_maps   : マインドマップ一覧（ユーザー紐付け）
 * - map_nodes   : キャンバス上のノード（4種: script_item / text / recording / section）
 * - map_edges   : ノード間の接続
 */
import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

async function migrateV22() {
  const dbUrl    = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!dbUrl || !authToken) {
    console.error("❌ エラー: TURSO_DATABASE_URL と TURSO_AUTH_TOKEN を .env に設定してください");
    process.exit(1);
  }

  const client = createClient({ url: dbUrl, authToken });

  try {
    // ---- mind_maps ----
    console.log("📝 mind_maps テーブルを作成中...");
    await client.execute(`
      CREATE TABLE IF NOT EXISTS mind_maps (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    await client.execute(
      "CREATE INDEX IF NOT EXISTS idx_mind_maps_user_id ON mind_maps(user_id)"
    );
    console.log("✓ mind_maps 完了");

    // ---- map_nodes ----
    console.log("📝 map_nodes テーブルを作成中...");
    await client.execute(`
      CREATE TABLE IF NOT EXISTS map_nodes (
        id TEXT PRIMARY KEY,
        map_id TEXT NOT NULL,
        node_type TEXT NOT NULL,
        script_item_id TEXT,
        label TEXT NOT NULL,
        content TEXT,
        audio_url TEXT,
        r2_key TEXT,
        color TEXT DEFAULT '#3B82F6',
        pos_x REAL DEFAULT 0,
        pos_y REAL DEFAULT 0,
        width REAL DEFAULT 200,
        height REAL DEFAULT 80,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (map_id) REFERENCES mind_maps(id) ON DELETE CASCADE,
        FOREIGN KEY (script_item_id) REFERENCES script_items(id) ON DELETE SET NULL
      )
    `);
    await client.execute(
      "CREATE INDEX IF NOT EXISTS idx_map_nodes_map_id ON map_nodes(map_id)"
    );
    console.log("✓ map_nodes 完了");

    // ---- map_edges ----
    console.log("📝 map_edges テーブルを作成中...");
    await client.execute(`
      CREATE TABLE IF NOT EXISTS map_edges (
        id TEXT PRIMARY KEY,
        map_id TEXT NOT NULL,
        source_node_id TEXT NOT NULL,
        target_node_id TEXT NOT NULL,
        label TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (map_id) REFERENCES mind_maps(id) ON DELETE CASCADE,
        FOREIGN KEY (source_node_id) REFERENCES map_nodes(id) ON DELETE CASCADE,
        FOREIGN KEY (target_node_id) REFERENCES map_nodes(id) ON DELETE CASCADE
      )
    `);
    await client.execute(
      "CREATE INDEX IF NOT EXISTS idx_map_edges_map_id ON map_edges(map_id)"
    );
    console.log("✓ map_edges 完了");

    console.log("\n✅ migrate-v22 (mind_maps) 完了");
  } catch (error) {
    console.error("❌ マイグレーションエラー:", error);
    process.exit(1);
  } finally {
    client.close();
  }
}

migrateV22();
