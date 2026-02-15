import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config();

async function migrateV8() {
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
    // categoriesテーブルを作成（動的カテゴリ管理）
    console.log("📝 categoriesテーブルを作成中...");
    await client.execute(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT DEFAULT '#6B7280',
        sort_order INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL
      )
    `);
    console.log("✓ categoriesテーブルを作成しました");

    // script_itemsテーブルにcategory_idとis_quick_responseを追加
    console.log("📝 script_itemsテーブルを拡張中...");
    
    try {
      await client.execute(
        "ALTER TABLE script_items ADD COLUMN category_id TEXT"
      );
      console.log("✓ category_id カラムを追加しました");
    } catch (e: any) {
      if (e.message.includes("duplicate column name")) {
        console.log("⚠️ category_id カラムは既に存在します");
      } else {
        throw e;
      }
    }

    try {
      await client.execute(
        "ALTER TABLE script_items ADD COLUMN is_quick_response INTEGER DEFAULT 0"
      );
      console.log("✓ is_quick_response カラムを追加しました");
    } catch (e: any) {
      if (e.message.includes("duplicate column name")) {
        console.log("⚠️ is_quick_response カラムは既に存在します");
      } else {
        throw e;
      }
    }

    // timelinesテーブルを作成（状況・シーン）
    console.log("📝 timelinesテーブルを作成中...");
    await client.execute(`
      CREATE TABLE IF NOT EXISTS timelines (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL
      )
    `);
    console.log("✓ timelinesテーブルを作成しました");

    // timeline_blocksテーブルを作成（タイムラインとトークの紐付け）
    console.log("📝 timeline_blocksテーブルを作成中...");
    await client.execute(`
      CREATE TABLE IF NOT EXISTS timeline_blocks (
        id TEXT PRIMARY KEY,
        timeline_id TEXT NOT NULL,
        script_item_id TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (timeline_id) REFERENCES timelines(id) ON DELETE CASCADE,
        FOREIGN KEY (script_item_id) REFERENCES script_items(id) ON DELETE CASCADE
      )
    `);
    console.log("✓ timeline_blocksテーブルを作成しました");

    // インデックスを作成
    console.log("📝 インデックスを作成中...");
    await client.execute(`
      CREATE INDEX IF NOT EXISTS idx_categories_sort 
      ON categories(sort_order)
    `);
    await client.execute(`
      CREATE INDEX IF NOT EXISTS idx_script_items_category 
      ON script_items(category_id)
    `);
    await client.execute(`
      CREATE INDEX IF NOT EXISTS idx_script_items_quick_response 
      ON script_items(is_quick_response)
    `);
    await client.execute(`
      CREATE INDEX IF NOT EXISTS idx_timeline_blocks_timeline 
      ON timeline_blocks(timeline_id, sort_order)
    `);
    console.log("✓ インデックスを作成しました");

    // デフォルトカテゴリを作成
    console.log("📝 デフォルトカテゴリを作成中...");
    const defaultCategories = [
      { id: "cat_hearing", name: "ヒアリング", color: "#3B82F6" },
      { id: "cat_chance", name: "チャンストーク", color: "#10B981" },
      { id: "cat_closing", name: "クロージング", color: "#8B5CF6" },
      { id: "cat_objection", name: "断り文句", color: "#EF4444" },
      { id: "cat_question", name: "質問返し", color: "#F59E0B" },
    ];

    for (let i = 0; i < defaultCategories.length; i++) {
      const cat = defaultCategories[i];
      const now = Date.now();
      try {
        await client.execute({
          sql: "INSERT INTO categories (id, name, color, sort_order, created_at) VALUES (?, ?, ?, ?, ?)",
          args: [cat.id, cat.name, cat.color, i, now],
        });
        console.log(`✓ カテゴリ「${cat.name}」を作成しました`);
      } catch (e: any) {
        if (e.message.includes("UNIQUE constraint")) {
          console.log(`⚠️ カテゴリ「${cat.name}」は既に存在します`);
        } else {
          throw e;
        }
      }
    }

    // デフォルトタイムラインを作成
    console.log("📝 デフォルトタイムラインを作成中...");
    const defaultTimelines = [
      { id: "tl_reception", title: "受付突破時", description: "受付を通過して担当者につながった時" },
      { id: "tl_hearing", title: "ヒアリング時", description: "課題や現状を聞き出す時" },
      { id: "tl_closing", title: "クロージング時", description: "アポイントを取る時" },
    ];

    for (let i = 0; i < defaultTimelines.length; i++) {
      const tl = defaultTimelines[i];
      const now = Date.now();
      try {
        await client.execute({
          sql: "INSERT INTO timelines (id, title, description, sort_order, created_at) VALUES (?, ?, ?, ?, ?)",
          args: [tl.id, tl.title, tl.description, i, now],
        });
        console.log(`✓ タイムライン「${tl.title}」を作成しました`);
      } catch (e: any) {
        if (e.message.includes("UNIQUE constraint")) {
          console.log(`⚠️ タイムライン「${tl.title}」は既に存在します`);
        } else {
          throw e;
        }
      }
    }

    console.log("✅ V8マイグレーションが正常に完了しました！");
  } catch (error) {
    console.error("❌ マイグレーションエラー:", error);
    process.exit(1);
  } finally {
    client.close();
  }
}

migrateV8();
