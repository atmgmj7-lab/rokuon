"use server";

import { db } from "@/src/lib/db";
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export interface UserListItem {
  id: string;
  email: string;
  name: string | null;
  role: string;
  created_at: number;
}

export async function addUser(
  email: string,
  password: string,
  role: "admin" | "viewer",
  name?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      return { success: false, error: "メールアドレスを入力してください" };
    }
    if (!password || password.length < 6) {
      return { success: false, error: "パスワードは6文字以上で入力してください" };
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const id = `user_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const now = Date.now();

    await db.execute({
      sql: `INSERT INTO users (id, email, name, password_hash, role, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [id, trimmedEmail, name?.trim() || null, passwordHash, role, now, now],
    });

    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("UNIQUE constraint failed") || msg.includes("unique")) {
      return { success: false, error: "このメールアドレスは既に登録されています" };
    }
    console.error("❌ ユーザー追加エラー:", error);
    return { success: false, error: msg };
  }
}

export async function getUsers(): Promise<UserListItem[]> {
  try {
    const result = await db.execute({
      sql: "SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC",
      args: [],
    });

    return result.rows.map((row) => ({
      id: row.id as string,
      email: row.email as string,
      name: (row.name as string) || null,
      role: (row.role as string) || "viewer",
      created_at: row.created_at as number,
    }));
  } catch (error) {
    console.error("❌ ユーザー一覧取得エラー:", error);
    return [];
  }
}
