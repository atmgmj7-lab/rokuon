/**
 * パフォーマンス用インデックスマイグレーション
 * - recordings: is_deleted, is_archived_training_data
 * - 複合インデックス（一覧クエリ最適化）
 */
import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config();

async function migrate() {
  const dbUrl = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!dbUrl || !authToken) {
    console.error("❌ TURSO_DATABASE_URL と TURSO_AUTH_TOKEN を設定してください");
    process.exit(1);
  }

  const client = createClient({ url: dbUrl, authToken });

  const indexes = [
    "CREATE INDEX IF NOT EXISTS idx_recordings_is_deleted ON recordings(is_deleted)",
    "CREATE INDEX IF NOT EXISTS idx_recordings_is_archived ON recordings(is_archived_training_data)",
    "CREATE INDEX IF NOT EXISTS idx_recordings_list_filter ON recordings(is_deleted, is_archived_training_data, parent_id)",
  ];

  for (const sql of indexes) {
    try {
      await client.execute(sql);
      console.log(`✓ ${sql}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`❌ ${sql}`, msg);
    }
  }

  client.close();
  console.log("✅ マイグレーション完了");
}

migrate();
