/**
 * 高度化機能用マイグレーション
 * - recordings: r2_key
 * - transcripts: original_content, corrected_content, learning_pending
 * - recording_categories テーブル（多対多）
 */
import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config();

async function migrate() {
  const dbUrl = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!dbUrl || !authToken) {
    console.error("❌ TURSO_DATABASE_URL と TURSO_AUTH_TOKEN を設定してください");
    process.exit(1);
  }

  const client = createClient({ url: dbUrl, authToken });

  const alterStatements = [
    "ALTER TABLE recordings ADD COLUMN r2_key TEXT",
    "ALTER TABLE recordings ADD COLUMN audio_category TEXT",
    "ALTER TABLE transcripts ADD COLUMN original_content TEXT",
    "ALTER TABLE transcripts ADD COLUMN corrected_content TEXT",
    "ALTER TABLE transcripts ADD COLUMN learning_pending INTEGER DEFAULT 0",
  ];

  for (const sql of alterStatements) {
    try {
      await client.execute(sql);
      console.log(`✓ ${sql}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("duplicate column") || msg.includes("already exists")) {
        console.log(`- スキップ（既存）: ${sql}`);
      } else {
        console.error(`❌ ${sql}`, e);
      }
    }
  }

  // 録音-カテゴリ多対多テーブル（categories テーブルは既存）
  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS recording_categories (
        id TEXT PRIMARY KEY,
        recording_id TEXT NOT NULL,
        category_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (recording_id) REFERENCES recordings(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
        UNIQUE(recording_id, category_id)
      )
    `);
    await client.execute(
      "CREATE INDEX IF NOT EXISTS idx_recording_categories_recording ON recording_categories(recording_id)"
    );
    await client.execute(
      "CREATE INDEX IF NOT EXISTS idx_recording_categories_category ON recording_categories(category_id)"
    );
    console.log("✓ recording_categories テーブル");
  } catch (e) {
    console.error("❌ recording_categories", e);
  }

  // デフォルトカテゴリを投入（存在しない場合）
  const defaults = [
    { name: "会議", color: "#3B82F6" },
    { name: "商談", color: "#10B981" },
    { name: "個人メモ", color: "#8B5CF6" },
  ];
  for (const d of defaults) {
    try {
      const existing = await client.execute({
        sql: "SELECT id FROM categories WHERE name = ?",
        args: [d.name],
      });
      if (existing.rows.length === 0) {
        const id = `cat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        await client.execute({
          sql: "INSERT INTO categories (id, name, color, sort_order, created_at) VALUES (?, ?, ?, ?, ?)",
          args: [id, d.name, d.color, 0, Date.now()],
        });
        console.log(`✓ デフォルトカテゴリ: ${d.name}`);
      }
    } catch (e) {
      console.warn(`カテゴリ ${d.name} 投入スキップ:`, e);
    }
  }

  client.close();
  console.log("✅ マイグレーション完了");
}

migrate();
