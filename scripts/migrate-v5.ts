import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config();

async function migrateV5() {
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
    // script_foldersテーブルにis_visible_in_sidebarカラムを追加
    console.log("📝 script_foldersテーブルにis_visible_in_sidebarカラムを追加中...");
    
    try {
      await client.execute(
        "ALTER TABLE script_folders ADD COLUMN is_visible_in_sidebar INTEGER DEFAULT 1"
      );
      console.log("✓ is_visible_in_sidebar カラムを追加しました");
    } catch (e: any) {
      if (e.message.includes("duplicate column name")) {
        console.log("⚠️ is_visible_in_sidebar カラムは既に存在します");
      } else {
        throw e;
      }
    }

    // 既存のfolder_typeカラムの値を更新（main_flow → base_talk, objection → situational）
    console.log("📝 既存データのfolder_type値を更新中...");
    
    await client.execute(`
      UPDATE script_folders 
      SET folder_type = CASE 
        WHEN folder_type = 'main_flow' THEN 'base_talk'
        WHEN folder_type = 'objection' THEN 'situational'
        ELSE folder_type
      END
    `);
    console.log("✓ folder_type値を更新しました");

    console.log("✅ V5マイグレーションが正常に完了しました！");
  } catch (error) {
    console.error("❌ マイグレーションエラー:", error);
    process.exit(1);
  } finally {
    client.close();
  }
}

migrateV5();
