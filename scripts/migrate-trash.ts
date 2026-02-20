/**
 * ゴミ箱機能用マイグレーション
 * - recordings: is_deleted, is_archived_training_data
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

  const alterStatements = [
    "ALTER TABLE recordings ADD COLUMN is_deleted INTEGER DEFAULT 0",
    "ALTER TABLE recordings ADD COLUMN is_archived_training_data INTEGER DEFAULT 0",
  ];

  for (const sql of alterStatements) {
    try {
      await client.execute(sql);
      console.log(`✓ ${sql}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("duplicate column") || msg.includes("already exists")) {
        console.log(`- スキップ（既存）: ${sql}`);
      } else {
        console.error(`❌ ${sql}`, e);
      }
    }
  }

  client.close();
  console.log("✅ マイグレーション完了");
}

migrate();
