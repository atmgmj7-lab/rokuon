import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config();

async function migrateV14() {
  const dbUrl = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!dbUrl || !authToken) {
    console.error("❌ エラー: 環境変数が設定されていません");
    process.exit(1);
  }

  console.log("🔌 Tursoデータベースに接続中...");

  const client = createClient({
    url: dbUrl,
    authToken: authToken,
  });

  try {
    console.log("📝 recordingsテーブルに memo, category カラムを追加中...");

    try {
      await client.execute(
        "ALTER TABLE recordings ADD COLUMN memo TEXT"
      );
      console.log("✓ memo カラムを追加しました");
    } catch (e: unknown) {
      const err = e as { message?: string };
      if (
        err.message?.includes("duplicate column") ||
        err.message?.includes("already exists")
      ) {
        console.log("⚠️ memo カラムは既に存在します");
      } else {
        throw e;
      }
    }

    try {
      await client.execute(
        "ALTER TABLE recordings ADD COLUMN category TEXT"
      );
      console.log("✓ category カラムを追加しました");
    } catch (e: unknown) {
      const err = e as { message?: string };
      if (
        err.message?.includes("duplicate column") ||
        err.message?.includes("already exists")
      ) {
        console.log("⚠️ category カラムは既に存在します");
      } else {
        throw e;
      }
    }

    console.log("✅ V14マイグレーション完了");
  } catch (error) {
    console.error("❌ マイグレーションエラー:", error);
    process.exit(1);
  } finally {
    client.close();
  }
}

migrateV14();
