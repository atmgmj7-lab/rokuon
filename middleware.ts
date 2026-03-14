import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getTokenFromRequest } from "@/src/lib/auth-request";
import { verifyToken } from "@/src/lib/auth";

/** 認証不要でアクセス可能なパス */
const PUBLIC_PATHS = ["/login", "/api/auth/ext-login", "/api/regions"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isApiPath(pathname: string): boolean {
  return pathname.startsWith("/api/");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // CORS プリフライト: OPTIONS は常に許可（拡張機能用）
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  // 公開パスは常に許可
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // JWT 取得: Cookie (scouter_session) または Authorization: Bearer <token>
  const token = await getTokenFromRequest(request);
  if (!token) {
    if (isApiPath(pathname)) {
      return NextResponse.json(
        { success: false, error: "認証が必要です" },
        { status: 401 }
      );
    }
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  const payload = await verifyToken(token);
  if (!payload) {
    if (isApiPath(pathname)) {
      return NextResponse.json(
        { success: false, error: "セッションが無効です" },
        { status: 401 }
      );
    }
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:ico|png|jpg|jpeg|gif|webp|svg)$).*)",
  ],
};
