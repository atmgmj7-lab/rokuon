/**
 * migrate-v19: user_script_selections 中間テーブルの作成
 *
 * 実行コマンド:
 *   npm run migrate:visibility
 * または
 *   npx tsx scripts/migrate-v19-user-script-selections.ts
 *
 * 事前に .env に TURSO_DATABASE_URL と TURSO_AUTH_TOKEN を設定してください。
 *
 * 追加内容:
 * - user_script_selections: ユーザーごとにトークのスカウター表示可否を管理
 *   - user_id (TEXT): ユーザーID
 *   - script_item_id (TEXT): トークID
 *   - is_visible (INTEGER): 1=表示, 0=非表示（デフォルト: 1）
 */
import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config();

async function migrateV19() {
  const dbUrl = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!dbUrl || !authToken) {
    console.error("❌ エラー: TURSO_DATABASE_URL と TURSO_AUTH_TOKEN を .env に設定してください");
    process.exit(1);
  }

  const client = createClient({ url: dbUrl, authToken });

  try {
    console.log("📝 user_script_selections テーブルを作成中...");
    await client.execute(`
      CREATE TABLE IF NOT EXISTS user_script_selections (
        user_id TEXT NOT NULL,
        script_item_id TEXT NOT NULL,
        is_visible INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER,
        updated_at INTEGER,
        PRIMARY KEY (user_id, script_item_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (script_item_id) REFERENCES script_items(id) ON DELETE CASCADE
      )
    `);
    console.log("✓ user_script_selections テーブルを作成しました");

    console.log("📝 インデックスを作成中...");
    try {
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_user_script_selections_user ON user_script_selections(user_id)"
      );
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_user_script_selections_item ON user_script_selections(script_item_id)"
      );
      console.log("✓ インデックスを作成しました");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("already exists") || msg.includes("duplicate")) {
        console.log("⚠️ インデックスは既に存在します");
      } else {
        throw e;
      }
    }

    console.log("\n✅ migrate-v19 (migrate:visibility) 完了");
  } catch (error) {
    console.error("❌ マイグレーションエラー:", error);
    process.exit(1);
  } finally {
    client.close();
  }
}

migrateV19();
