import { createClient } from "@libsql/client";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// .env ファイルを読み込む
dotenv.config();

async function migrate() {
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
    // スキーマファイルを読み込む
    const schemaPath = path.join(process.cwd(), "src/lib/db/schema.sql");
    const schema = fs.readFileSync(schemaPath, "utf-8");

    // スキーマをセミコロンで分割して各SQLステートメントを実行
    const statements = schema
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    console.log(`📝 ${statements.length} 件のSQLステートメントを実行中...`);

    for (const statement of statements) {
      await client.execute(statement);
      console.log(`✓ 実行完了: ${statement.substring(0, 50)}...`);
    }

    console.log("✅ マイグレーションが正常に完了しました！");
  } catch (error) {
    console.error("❌ マイグレーションエラー:", error);
    process.exit(1);
  } finally {
    client.close();
  }
}

migrate();
