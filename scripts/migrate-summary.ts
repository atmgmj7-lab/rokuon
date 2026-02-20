/**
 * 学習データまとめ用マイグレーション
 * - recordings: summary（学習データ登録時の総評・指導まとめ）
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

  try {
    await client.execute("ALTER TABLE recordings ADD COLUMN summary TEXT");
    console.log("✓ ALTER TABLE recordings ADD COLUMN summary TEXT");
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("duplicate column") || msg.includes("already exists")) {
      console.log("- スキップ（既存）: summary");
    } else {
      console.error("❌ summary 追加失敗", e);
    }
  }

  client.close();
  console.log("✅ マイグレーション完了");
}

migrate();
