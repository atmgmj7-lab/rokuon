/**
 * 拡張機能向け スカウト API プロキシ
 * Bearer トークン必須。Python バックエンドへプロキシ。
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/src/lib/auth-request";

const PYTHON_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8765";

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      { success: false, error: "認証が必要です" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const base = PYTHON_API_URL.replace(/\/$/, "");
    const res = await fetch(`${base}/scout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        data || { success: false, error: "scout に失敗しました" },
        { status: res.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("❌ ext/scout プロキシエラー:", error);
    return NextResponse.json(
      { success: false, error: "バックエンドに接続できません" },
      { status: 502 }
    );
  }
}
