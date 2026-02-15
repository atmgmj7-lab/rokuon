import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

// .env ファイルを読み込む
dotenv.config();

async function migrateV2() {
  const dbUrl = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!dbUrl || !authToken) {
    console.error("❌ エラー: TURSO_DATABASE_URL と TURSO_AUTH_TOKEN を .env ファイルに設定してください");
    process.exit(1);
  }

  console.log("🔌 Tursoデータベースに接続中...");
  
  const client = createClient({
    url: dbUrl,
    authToken: authToken,
  });

  try {
    // recordingsテーブルに新しいカラムを追加
    console.log("📝 recordingsテーブルに新しいカラムを追加中...");
    
    try {
      await client.execute("ALTER TABLE recordings ADD COLUMN recording_type TEXT NOT NULL DEFAULT 'case'");
      console.log("✓ recording_type カラムを追加しました");
    } catch (e: any) {
      if (e.message.includes("duplicate column name")) {
        console.log("⚠️ recording_type カラムは既に存在します");
      } else {
        throw e;
      }
    }

    try {
      await client.execute("ALTER TABLE recordings ADD COLUMN parent_id TEXT");
      console.log("✓ parent_id カラムを追加しました");
    } catch (e: any) {
      if (e.message.includes("duplicate column name")) {
        console.log("⚠️ parent_id カラムは既に存在します");
      } else {
        throw e;
      }
    }

    try {
      await client.execute("ALTER TABLE recordings ADD COLUMN category_id TEXT");
      console.log("✓ category_id カラムを追加しました");
    } catch (e: any) {
      if (e.message.includes("duplicate column name")) {
        console.log("⚠️ category_id カラムは既に存在します");
      } else {
        throw e;
      }
    }

    // analysis_resultsテーブルを作成
    console.log("📝 analysis_resultsテーブルを作成中...");
    await client.execute(`
      CREATE TABLE IF NOT EXISTS analysis_results (
        id TEXT PRIMARY KEY,
        case_recording_id TEXT NOT NULL,
        feedback_recording_id TEXT NOT NULL,
        analysis_data TEXT NOT NULL,
        tags TEXT,
        is_knowledge_base INTEGER DEFAULT 1,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (case_recording_id) REFERENCES recordings(id) ON DELETE CASCADE,
        FOREIGN KEY (feedback_recording_id) REFERENCES recordings(id) ON DELETE CASCADE
      )
    `);
    console.log("✓ analysis_resultsテーブルを作成しました");

    // インデックスを作成
    console.log("📝 インデックスを作成中...");
    
    const indexes = [
      "CREATE INDEX IF NOT EXISTS idx_recordings_parent_id ON recordings(parent_id)",
      "CREATE INDEX IF NOT EXISTS idx_recordings_type ON recordings(recording_type)",
      "CREATE INDEX IF NOT EXISTS idx_analysis_case_recording ON analysis_results(case_recording_id)",
      "CREATE INDEX IF NOT EXISTS idx_analysis_feedback_recording ON analysis_results(feedback_recording_id)",
    ];

    for (const indexSql of indexes) {
      await client.execute(indexSql);
      console.log(`✓ インデックスを作成: ${indexSql.substring(0, 60)}...`);
    }

    console.log("✅ V2マイグレーションが正常に完了しました！");
  } catch (error) {
    console.error("❌ マイグレーションエラー:", error);
    process.exit(1);
  } finally {
    client.close();
  }
}

migrateV2();
