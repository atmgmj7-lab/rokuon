/**
 * Turso DB データ確認用一時スクリプト
 * - script_items / script_categories の行数
 * - 最新1〜2件のテキスト内容を表示
 */
import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const dbUrl = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!dbUrl || !authToken) {
    console.error("❌ TURSO_DATABASE_URL または TURSO_AUTH_TOKEN が未設定です");
    process.exit(1);
  }

  console.log(`📌 接続先: ${dbUrl.slice(0, 50)}...`);
  console.log();

  const client = createClient({ url: dbUrl, authToken });

  try {
    // script_categories 行数
    const catResult = await client.execute("SELECT COUNT(*) as cnt FROM script_categories");
    const catCount = Number(catResult.rows[0]?.cnt ?? 0);
    console.log(`📊 script_categories: ${catCount} 件`);

    // script_items 行数
    const itemsResult = await client.execute("SELECT COUNT(*) as cnt FROM script_items");
    const itemsCount = Number(itemsResult.rows[0]?.cnt ?? 0);
    console.log(`📊 script_items: ${itemsCount} 件`);

    // script_folders 行数
    const foldersResult = await client.execute("SELECT COUNT(*) as cnt FROM script_folders");
    const foldersCount = Number(foldersResult.rows[0]?.cnt ?? 0);
    console.log(`📊 script_folders: ${foldersCount} 件`);
    console.log();

    // script_items 最新2件
    const latest = await client.execute(`
    SELECT si.id, si.title, si.content, si.created_at
    FROM script_items si
    ORDER BY si.updated_at DESC, si.created_at DESC
    LIMIT 2
  `);
    console.log("📝 script_items 最新2件:");
    for (let i = 0; i < latest.rows.length; i++) {
      const row = latest.rows[i];
      const content = String(row.content ?? "").slice(0, 80).replace(/\n/g, " ");
      const preview = content + (String(row.content ?? "").length > 80 ? "..." : "");
      console.log(`   [${i + 1}] id=${row.id}, title=${JSON.stringify(row.title)}`);
      console.log(`       content(先頭80文字): ${JSON.stringify(preview)}`);
      console.log(`       created_at: ${row.created_at}`);
      console.log();
    }

    // script_categories 最新2件
    const catLatest = await client.execute(
      "SELECT id, name, description FROM script_categories ORDER BY created_at DESC LIMIT 2"
    );
    console.log("📝 script_categories 最新2件:");
    for (let i = 0; i < catLatest.rows.length; i++) {
      const row = catLatest.rows[i];
      console.log(`   [${i + 1}] id=${row.id}, name=${JSON.stringify(row.name)}, description=${JSON.stringify(row.description)}`);
    }

    console.log();
    console.log("✅ チェック完了");
  } catch (e) {
    console.error("❌ エラー:", e);
    process.exit(1);
  } finally {
    client.close();
  }
}

main();
