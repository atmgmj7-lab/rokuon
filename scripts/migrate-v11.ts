import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config();

async function migrateV11() {
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
    // recordingsにcustom_idを追加（ユーザーが設定する参照ID）
    console.log("📝 recordingsテーブルを拡張中...");

    try {
      await client.execute(
        "ALTER TABLE recordings ADD COLUMN custom_id TEXT"
      );
      console.log("✓ custom_id カラムを追加しました");
    } catch (e: any) {
      if (e.message?.includes("duplicate column") || e.message?.includes("already exists")) {
        console.log("⚠️ custom_id カラムは既に存在します");
      } else {
        throw e;
      }
    }

    console.log("✅ V11マイグレーション完了");
  } catch (error) {
    console.error("❌ マイグレーションエラー:", error);
    process.exit(1);
  } finally {
    client.close();
  }
}

migrateV11();
