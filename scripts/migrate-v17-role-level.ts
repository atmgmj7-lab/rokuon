/**
 * migrate-v17: 権限分離（role）とトークレベル（level）の追加
 *
 * 実行コマンド:
 *   npm run migrate:role-level
 * または
 *   npx tsx scripts/migrate-v17-role-level.ts
 *
 * 事前に .env に TURSO_DATABASE_URL と TURSO_AUTH_TOKEN を設定してください。
 *
 * 追加内容:
 * - users.role: 'admin' | 'viewer'（デフォルト: 'viewer'）
 * - script_items.level: 1=初級, 2=中級, 3=上級（デフォルト: 1）
 */
import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config();

async function migrateV17() {
  const dbUrl = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!dbUrl || !authToken) {
    console.error("❌ エラー: TURSO_DATABASE_URL と TURSO_AUTH_TOKEN を .env に設定してください");
    process.exit(1);
  }

  const client = createClient({ url: dbUrl, authToken });

  try {
    // users.role 追加
    console.log("📝 users.role を追加中...");
    try {
      await client.execute(
        "ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'viewer'"
      );
      console.log("✓ users.role を追加しました");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("duplicate column name")) {
        console.log("⚠️ users.role は既に存在します");
      } else {
        throw e;
      }
    }

    // script_items.level 追加（1=初級, 2=中級, 3=上級）
    console.log("📝 script_items.level を追加中...");
    try {
      await client.execute(
        "ALTER TABLE script_items ADD COLUMN level INTEGER DEFAULT 1"
      );
      console.log("✓ script_items.level を追加しました");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("duplicate column name")) {
        console.log("⚠️ script_items.level は既に存在します");
      } else {
        throw e;
      }
    }

    // 既存 script_items の level を 1 に統一（NULL の場合）
    await client.execute(
      "UPDATE script_items SET level = 1 WHERE level IS NULL"
    );
    console.log("✓ 既存 script_items の level を初期化しました");

    console.log("\n✅ migrate-v17 完了");
  } finally {
    client.close();
  }
}

migrateV17();
