import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config();

async function migrateV9() {
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
    // situationsテーブルを作成（状況タグ）
    console.log("📝 situationsテーブルを作成中...");
    await client.execute(`
      CREATE TABLE IF NOT EXISTS situations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        color TEXT DEFAULT '#3B82F6',
        icon TEXT DEFAULT '📌',
        sort_order INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL
      )
    `);
    console.log("✓ situationsテーブルを作成しました");

    // check_itemsテーブルを作成（チェック項目マスター）
    console.log("📝 check_itemsテーブルを作成中...");
    await client.execute(`
      CREATE TABLE IF NOT EXISTS check_items (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL
      )
    `);
    console.log("✓ check_itemsテーブルを作成しました");

    // timelinesテーブルにsituation_idを追加
    console.log("📝 timelinesテーブルを拡張中...");
    try {
      await client.execute(
        "ALTER TABLE timelines ADD COLUMN situation_id TEXT"
      );
      console.log("✓ situation_id カラムを追加しました");
    } catch (e: any) {
      if (e.message.includes("duplicate column name")) {
        console.log("⚠️ situation_id カラムは既に存在します");
      } else {
        throw e;
      }
    }

    // timeline_check_itemsテーブルを作成（タイムラインとチェック項目の紐付け）
    console.log("📝 timeline_check_itemsテーブルを作成中...");
    await client.execute(`
      CREATE TABLE IF NOT EXISTS timeline_check_items (
        id TEXT PRIMARY KEY,
        timeline_id TEXT NOT NULL,
        check_item_id TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (timeline_id) REFERENCES timelines(id) ON DELETE CASCADE,
        FOREIGN KEY (check_item_id) REFERENCES check_items(id) ON DELETE CASCADE
      )
    `);
    console.log("✓ timeline_check_itemsテーブルを作成しました");

    // script_itemsテーブルにitem_typeを追加（base_scenario or response_talk）
    console.log("📝 script_itemsテーブルを拡張中...");
    try {
      await client.execute(
        "ALTER TABLE script_items ADD COLUMN item_type TEXT DEFAULT 'base_scenario'"
      );
      console.log("✓ item_type カラムを追加しました");
    } catch (e: any) {
      if (e.message.includes("duplicate column name")) {
        console.log("⚠️ item_type カラムは既に存在します");
      } else {
        throw e;
      }
    }

    // インデックスを作成
    console.log("📝 インデックスを作成中...");
    await client.execute(`
      CREATE INDEX IF NOT EXISTS idx_situations_sort 
      ON situations(sort_order)
    `);
    await client.execute(`
      CREATE INDEX IF NOT EXISTS idx_check_items_category 
      ON check_items(category, sort_order)
    `);
    await client.execute(`
      CREATE INDEX IF NOT EXISTS idx_timelines_situation 
      ON timelines(situation_id)
    `);
    await client.execute(`
      CREATE INDEX IF NOT EXISTS idx_timeline_check_items_timeline 
      ON timeline_check_items(timeline_id, sort_order)
    `);
    await client.execute(`
      CREATE INDEX IF NOT EXISTS idx_script_items_type 
      ON script_items(item_type)
    `);
    console.log("✓ インデックスを作成しました");

    // デフォルトの状況タグを作成
    console.log("📝 デフォルト状況タグを作成中...");
    const defaultSituations = [
      { id: "sit_reception", name: "受付突破時", description: "受付を通過して担当者につながった時", icon: "📞", color: "#3B82F6" },
      { id: "sit_contact", name: "担当者接続時", description: "担当者が電話に出た直後", icon: "🎯", color: "#10B981" },
      { id: "sit_hearing", name: "ヒアリング時", description: "課題や現状を聞き出す時", icon: "👂", color: "#8B5CF6" },
      { id: "sit_closing", name: "クロージング時", description: "アポイントを取る時", icon: "🤝", color: "#F59E0B" },
      { id: "sit_objection", name: "断られた時", description: "断りや抵抗を受けた時", icon: "🛡️", color: "#EF4444" },
    ];

    for (let i = 0; i < defaultSituations.length; i++) {
      const sit = defaultSituations[i];
      const now = Date.now();
      try {
        await client.execute({
          sql: "INSERT INTO situations (id, name, description, icon, color, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
          args: [sit.id, sit.name, sit.description, sit.icon, sit.color, i, now],
        });
        console.log(`✓ 状況タグ「${sit.name}」を作成しました`);
      } catch (e: any) {
        if (e.message.includes("UNIQUE constraint")) {
          console.log(`⚠️ 状況タグ「${sit.name}」は既に存在します`);
        } else {
          throw e;
        }
      }
    }

    // デフォルトのチェック項目を作成
    console.log("📝 デフォルトチェック項目を作成中...");
    const defaultCheckItems = [
      { id: "chk_budget", name: "予算の確認", description: "BANT: Budget", category: "BANT" },
      { id: "chk_authority", name: "決裁権の確認", description: "BANT: Authority", category: "BANT" },
      { id: "chk_needs", name: "ニーズの確認", description: "BANT: Needs", category: "BANT" },
      { id: "chk_timeline", name: "導入時期の確認", description: "BANT: Timeline", category: "BANT" },
      { id: "chk_competitor", name: "競合状況の確認", description: "他社サービスの利用状況", category: "市場調査" },
      { id: "chk_pain", name: "課題の深掘り", description: "現状の問題点を明確化", category: "ヒアリング" },
    ];

    for (let i = 0; i < defaultCheckItems.length; i++) {
      const item = defaultCheckItems[i];
      const now = Date.now();
      try {
        await client.execute({
          sql: "INSERT INTO check_items (id, name, description, category, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?)",
          args: [item.id, item.name, item.description, item.category, i, now],
        });
        console.log(`✓ チェック項目「${item.name}」を作成しました`);
      } catch (e: any) {
        if (e.message.includes("UNIQUE constraint")) {
          console.log(`⚠️ チェック項目「${item.name}」は既に存在します`);
        } else {
          throw e;
        }
      }
    }

    // 既存のtimelinesにsituation_idを設定
    console.log("📝 既存タイムラインを更新中...");
    try {
      await client.execute({
        sql: "UPDATE timelines SET situation_id = ? WHERE id = ?",
        args: ["sit_reception", "tl_reception"],
      });
      await client.execute({
        sql: "UPDATE timelines SET situation_id = ? WHERE id = ?",
        args: ["sit_hearing", "tl_hearing"],
      });
      await client.execute({
        sql: "UPDATE timelines SET situation_id = ? WHERE id = ?",
        args: ["sit_closing", "tl_closing"],
      });
      console.log("✓ 既存タイムラインを更新しました");
    } catch (e) {
      console.log("⚠️ タイムライン更新をスキップ（データが存在しない可能性）");
    }

    console.log("✅ V9マイグレーションが正常に完了しました！");
  } catch (error) {
    console.error("❌ マイグレーションエラー:", error);
    process.exit(1);
  } finally {
    client.close();
  }
}

migrateV9();
