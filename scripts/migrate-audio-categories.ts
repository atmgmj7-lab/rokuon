/**
 * 音声カテゴリ（audio_categories）テーブル新設マイグレーション
 * ワークスペースカテゴリ（categories）とは完全に独立した音声種類管理
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

  // audio_categories テーブル作成
  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS audio_categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        color TEXT DEFAULT '#6B7280',
        sort_order INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL
      )
    `);
    console.log("✓ audio_categories テーブル");
  } catch (e) {
    console.error("❌ audio_categories", e);
  }

  // recordings.audio_category_id 追加
  try {
    await client.execute("ALTER TABLE recordings ADD COLUMN audio_category_id TEXT");
    console.log("✓ recordings.audio_category_id");
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("duplicate column") || msg.includes("already exists")) {
      console.log("- スキップ（既存）: recordings.audio_category_id");
    } else {
      console.error("❌ recordings.audio_category_id", e);
    }
  }

  // デフォルト音声カテゴリ投入
  const defaults = [
    { name: "会議", color: "#3B82F6" },
    { name: "商談", color: "#10B981" },
    { name: "メモ", color: "#8B5CF6" },
    { name: "指導", color: "#C87A55" },
    { name: "その他", color: "#6B7280" },
  ];
  for (const d of defaults) {
    try {
      const existing = await client.execute({
        sql: "SELECT id FROM audio_categories WHERE name = ?",
        args: [d.name],
      });
      if (existing.rows.length === 0) {
        const id = `acat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        await client.execute({
          sql: "INSERT INTO audio_categories (id, name, color, sort_order, created_at) VALUES (?, ?, ?, ?, ?)",
          args: [id, d.name, d.color, defaults.indexOf(d), Date.now()],
        });
        console.log(`✓ デフォルト音声カテゴリ: ${d.name}`);
      }
    } catch (e) {
      console.warn(`音声カテゴリ ${d.name} 投入スキップ:`, e);
    }
  }

  // 既存の audio_category (TEXT) から audio_category_id へ移行
  try {
    const recordings = await client.execute({
      sql: "SELECT id, audio_category FROM recordings WHERE audio_category IS NOT NULL AND audio_category != ''",
      args: [],
    });
    for (const row of recordings.rows) {
      const acat = await client.execute({
        sql: "SELECT id FROM audio_categories WHERE name = ?",
        args: [row.audio_category],
      });
      if (acat.rows.length > 0) {
        await client.execute({
          sql: "UPDATE recordings SET audio_category_id = ? WHERE id = ?",
          args: [acat.rows[0].id, row.id],
        });
      }
    }
    console.log(`✓ ${recordings.rows.length} 件の録音を audio_category_id に移行`);
  } catch (e) {
    console.warn("移行スキップ:", e);
  }

  client.close();
  console.log("✅ マイグレーション完了");
}

migrate();
