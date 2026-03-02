/**
 * migrate-v18: users テーブルに password_hash を追加
 *
 * 実行: npm run migrate:users-password
 *
 * - users.password_hash: パスワードのbcryptハッシュ保存用
 */
import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config();

async function migrateV18() {
  const dbUrl = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!dbUrl || !authToken) {
    console.error("❌ エラー: TURSO_DATABASE_URL と TURSO_AUTH_TOKEN を .env に設定してください");
    process.exit(1);
  }

  const client = createClient({ url: dbUrl, authToken });

  try {
    console.log("📝 users.password_hash を追加中...");
    try {
      await client.execute(
        "ALTER TABLE users ADD COLUMN password_hash TEXT"
      );
      console.log("✓ users.password_hash を追加しました");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("duplicate column name")) {
        console.log("⚠️ users.password_hash は既に存在します");
      } else {
        throw e;
      }
    }

    console.log("\n✅ migrate-v18 完了");
  } finally {
    client.close();
  }
}

migrateV18();
