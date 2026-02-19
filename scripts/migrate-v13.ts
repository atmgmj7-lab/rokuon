import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config();

async function migrateV13() {
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
    console.log("📝 transcript_correctionsテーブルを作成中...");

    await client.execute(`
      CREATE TABLE IF NOT EXISTS transcript_corrections (
        id TEXT PRIMARY KEY,
        recording_id TEXT NOT NULL,
        transcript_id TEXT,
        original_text TEXT NOT NULL,
        corrected_text TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (recording_id) REFERENCES recordings(id) ON DELETE CASCADE
      )
    `);
    console.log("✓ transcript_correctionsテーブルを作成しました");

    try {
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_transcript_corrections_recording_id ON transcript_corrections(recording_id)"
      );
      console.log("✓ idx_transcript_corrections_recording_id インデックスを作成しました");
    } catch (e: unknown) {
      const err = e as { message?: string };
      if (err.message?.includes("already exists")) {
        console.log("⚠️ idx_transcript_corrections_recording_id は既に存在します");
      } else {
        throw e;
      }
    }

    try {
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_transcript_corrections_created_at ON transcript_corrections(created_at DESC)"
      );
      console.log("✓ idx_transcript_corrections_created_at インデックスを作成しました");
    } catch (e: unknown) {
      const err = e as { message?: string };
      if (err.message?.includes("already exists")) {
        console.log("⚠️ idx_transcript_corrections_created_at は既に存在します");
      } else {
        throw e;
      }
    }

    console.log("✅ V13マイグレーション完了");
  } catch (error) {
    console.error("❌ マイグレーションエラー:", error);
    process.exit(1);
  } finally {
    client.close();
  }
}

migrateV13();
