/**
 * hearing_items を「タイトル＋内容」構造に変更
 * - text を content にリネーム
 * - title カラムを追加
 * - 既存データ: text を content に移行し、先頭50文字を title に設定（空の場合は「（無題）」）
 */
import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config();

async function migrateV16() {
  const dbUrl = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!dbUrl || !authToken) {
    console.error("❌ エラー: 環境変数が設定されていません");
    process.exit(1);
  }

  const client = createClient({
    url: dbUrl,
    authToken: authToken,
  });

  try {
    // SQLite 3.35.0+ の RENAME COLUMN を使用
    console.log("📝 hearing_items: text を content にリネーム中...");
    try {
      await client.execute("ALTER TABLE hearing_items RENAME COLUMN text TO content");
      console.log("✓ text → content リネーム完了");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("no such column") || msg.includes("duplicate column")) {
        console.log("- スキップ（既に移行済みの可能性）");
      } else {
        throw e;
      }
    }

    console.log("📝 hearing_items: title カラムを追加中...");
    try {
      await client.execute("ALTER TABLE hearing_items ADD COLUMN title TEXT");
      console.log("✓ title カラム追加完了");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("duplicate column") || msg.includes("already exists")) {
        console.log("- スキップ（title は既に存在）");
      } else {
        throw e;
      }
    }

    // 既存データの title を補完（title が NULL または空の行）
    console.log("📝 既存データの title を補完中...");
    const rowsResult = await client.execute(
      "SELECT id, content FROM hearing_items WHERE title IS NULL OR title = ''"
    );
    const rows = rowsResult.rows ?? [];
    for (const row of rows) {
      const r = row as { id: string; content: string | null };
      const id = r.id;
      const content = r.content ?? "";
      const title = content.trim()
        ? content.slice(0, 50) + (content.length > 50 ? "…" : "")
        : "（無題）";
      await client.execute({
        sql: "UPDATE hearing_items SET title = ? WHERE id = ?",
        args: [title, id],
      });
    }
    if (rows.length > 0) {
      console.log(`✓ ${rows.length} 件の title を補完しました`);
    }

    console.log("✅ V16マイグレーション完了");
  } catch (error) {
    console.error("❌ マイグレーションエラー:", error);
    process.exit(1);
  } finally {
    client.close();
  }
}

migrateV16();
