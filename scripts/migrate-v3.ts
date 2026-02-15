import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config();

async function migrateV3() {
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
    // knowledge_baseテーブルを作成
    console.log("📝 knowledge_baseテーブルを作成中...");
    await client.execute(`
      CREATE TABLE IF NOT EXISTS knowledge_base (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        tags TEXT,
        logic_explanation TEXT,
        success_factors TEXT,
        next_move_hint TEXT,
        usage_count INTEGER DEFAULT 0,
        success_count INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);
    console.log("✓ knowledge_baseテーブルを作成しました");

    // インデックスを作成
    console.log("📝 インデックスを作成中...");
    
    const indexes = [
      "CREATE INDEX IF NOT EXISTS idx_knowledge_category ON knowledge_base(category)",
      "CREATE INDEX IF NOT EXISTS idx_knowledge_tags ON knowledge_base(tags)",
    ];

    for (const indexSql of indexes) {
      await client.execute(indexSql);
      console.log(`✓ インデックスを作成: ${indexSql.substring(0, 60)}...`);
    }

    console.log("✅ V3マイグレーションが正常に完了しました！");
  } catch (error) {
    console.error("❌ マイグレーションエラー:", error);
    process.exit(1);
  } finally {
    client.close();
  }
}

migrateV3();
