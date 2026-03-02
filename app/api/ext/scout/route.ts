/**
 * 拡張機能向け スカウト API プロキシ
 * Bearer トークン必須。Python バックエンドへプロキシ。
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/src/lib/auth-request";

const PYTHON_API_URL = process.env.NEXT_PUBLIC_API_URL || "https://rokuon.onrender.com";

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "認証が必要です" },
        { status: 401 }
      );
    }

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
    const err = error instanceof Error ? error : new Error(String(error));
    const detail = err.message || String(error);
    const type = err.name || "Error";
    console.error("❌ ext/scout プロキシエラー:", type, detail, err);
    return NextResponse.json(
      {
        success: false,
        error: detail,
        type,
        hint: detail.includes("API") ? "APIキー不足の可能性" : detail.includes("fetch") ? "バックエンド接続失敗" : undefined,
      },
      { status: 500 }
    );
  }
}
