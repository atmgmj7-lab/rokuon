"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/src/lib/db";
import bcrypt from "bcryptjs";
import { signToken, verifyToken } from "@/src/lib/auth";

const COOKIE_NAME = "scouter_session";

export interface CurrentUser {
  id: string;
  email: string;
  role: "admin" | "viewer";
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/**
 * 管理者権限を要求。viewer の場合はエラーをスロー。
 * API Route や throw でエラーを返す Server Action で使用。
 */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("認証が必要です");
  }
  if (user.role !== "admin") {
    throw new Error("この操作は管理者のみ行えます");
  }
  return user;
}

/**
 * 管理者権限をチェック。viewer の場合は { success: false, error } を返す。
 * { success, error } を返す Server Action の先頭で使用。
 */
export async function requireAdminOrError(): Promise<{ success: false; error: string } | null> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "認証が必要です" };
  if (user.role !== "admin") return { success: false, error: "この操作は管理者のみ行えます" };
  return null;
}

export interface LoginResult {
  success: boolean;
  error?: string;
}

export async function loginUser(
  email: string,
  password: string
): Promise<LoginResult> {
  try {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) {
      return { success: false, error: "メールアドレスとパスワードを入力してください" };
    }

    const result = await db.execute({
      sql: "SELECT id, email, password_hash, role FROM users WHERE email = ? LIMIT 1",
      args: [trimmedEmail],
    });

    if (result.rows.length === 0) {
      return { success: false, error: "メールアドレスまたはパスワードが正しくありません" };
    }

    const row = result.rows[0];
    const passwordHash = row.password_hash as string | null;
    if (!passwordHash) {
      return { success: false, error: "このアカウントはパスワード未設定です。管理者に連絡してください。" };
    }

    const valid = await bcrypt.compare(password, passwordHash);
    if (!valid) {
      return { success: false, error: "メールアドレスまたはパスワードが正しくありません" };
    }

    const id = row.id as string;
    const role = (row.role as string) === "admin" ? "admin" : "viewer";

    const token = await signToken({
      id,
      email: row.email as string,
      role,
    });

    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7日
      sameSite: "lax",
    });

    return { success: true };
  } catch (error) {
    console.error("❌ ログインエラー:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "ログインに失敗しました",
    };
  }
}

export async function logoutUser(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  redirect("/login");
}
