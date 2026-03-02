/**
 * 拡張機能向けログイン API
 *
 * POST body: { email: string, password: string }
 * Response: { token: string, user: { id, email, role } }
 *
 * CORS: chrome-extension:// からのリクエストを許可
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/lib/db";
import bcrypt from "bcryptjs";
import { signToken } from "@/src/lib/auth";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

function withCors(res: NextResponse): NextResponse {
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

/** CORS プリフライト対応 */
export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = (body?.email as string)?.trim()?.toLowerCase();
    const password = body?.password as string;

    if (!email || !password) {
      return withCors(
        NextResponse.json(
          { success: false, error: "メールアドレスとパスワードを入力してください" },
          { status: 400 }
        )
      );
    }

    const result = await db.execute({
      sql: "SELECT id, email, password_hash, role FROM users WHERE email = ? LIMIT 1",
      args: [email],
    });

    if (result.rows.length === 0) {
      return withCors(
        NextResponse.json(
          { success: false, error: "メールアドレスまたはパスワードが正しくありません" },
          { status: 401 }
        )
      );
    }

    const row = result.rows[0];
    const passwordHash = row.password_hash as string | null;
    if (!passwordHash) {
      return withCors(
        NextResponse.json(
          { success: false, error: "このアカウントはパスワード未設定です。管理者に連絡してください。" },
          { status: 401 }
        )
      );
    }

    const valid = await bcrypt.compare(password, passwordHash);
    if (!valid) {
      return withCors(
        NextResponse.json(
          { success: false, error: "メールアドレスまたはパスワードが正しくありません" },
          { status: 401 }
        )
      );
    }

    const id = row.id as string;
    const role = (row.role as string) === "admin" ? "admin" : "viewer";

    const token = await signToken({
      id,
      email: row.email as string,
      role,
    });

    return withCors(
      NextResponse.json({
        success: true,
        token,
        user: { id, email: row.email as string, role },
      })
    );
  } catch (error) {
    console.error("❌ ext-login エラー:", error);
    return withCors(
      NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "ログインに失敗しました",
        },
        { status: 500 }
      )
    );
  }
}
