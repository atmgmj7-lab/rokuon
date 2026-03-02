/**
 * 初期管理者（マスターアカウント）を users テーブルに登録するシードスクリプト
 *
 * 実行: npm run seed:admin
 *
 * 初回デプロイ後、最初のログインを行うための管理者アカウントを作成します。
 */
import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";

dotenv.config();

const SALT_ROUNDS = 10;

const ADMIN_EMAIL = "atmgmj7@gmail.com";
const ADMIN_PASSWORD = "master123";
const ADMIN_ROLE = "admin";
const ADMIN_DISPLAY_NAME = "マスター管理者";

async function createAdmin() {
  const dbUrl = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!dbUrl || !authToken) {
    console.error("❌ エラー: TURSO_DATABASE_URL と TURSO_AUTH_TOKEN を .env に設定してください");
    process.exit(1);
  }

  const client = createClient({ url: dbUrl, authToken });

  try {
    // 既存ユーザー確認
    const existing = await client.execute({
      sql: "SELECT id FROM users WHERE email = ? LIMIT 1",
      args: [ADMIN_EMAIL],
    });

    if (existing.rows.length > 0) {
      console.log("⚠️ このメールアドレスの管理者は既に存在します。スキップします。");
      return;
    }

    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, SALT_ROUNDS);
    const id = `user_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const now = Date.now();

    await client.execute({
      sql: `INSERT INTO users (id, email, name, password_hash, role, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [id, ADMIN_EMAIL, ADMIN_DISPLAY_NAME, passwordHash, ADMIN_ROLE, now, now],
    });

    console.log("✅ マスター管理者を作成しました");
    console.log(`   email: ${ADMIN_EMAIL}`);
    console.log(`   display_name: ${ADMIN_DISPLAY_NAME}`);
    console.log(`   role: ${ADMIN_ROLE}`);
    console.log(`   パスワード: ${ADMIN_PASSWORD} （本番では変更してください）`);
  } catch (error) {
    console.error("❌ エラー:", error);
    process.exit(1);
  } finally {
    client.close();
  }
}

createAdmin();
