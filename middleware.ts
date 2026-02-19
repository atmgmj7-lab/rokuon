import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const authUser = process.env.BASIC_AUTH_USER;
  const authPassword = process.env.BASIC_AUTH_PASSWORD;

  // 環境変数が未設定の場合は認証をスキップ（開発時など）
  if (!authUser || !authPassword) {
    return NextResponse.next();
  }

  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return new NextResponse("Authentication required", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Secure Area", charset="UTF-8"',
      },
    });
  }

  try {
    const base64Credentials = authHeader.slice(6);
    const credentials = atob(base64Credentials);
    const colonIndex = credentials.indexOf(":");
    const user = colonIndex >= 0 ? credentials.slice(0, colonIndex) : "";
    const password = colonIndex >= 0 ? credentials.slice(colonIndex + 1) : "";

    if (user === authUser && password === authPassword) {
      return NextResponse.next();
    }
  } catch {
    // デコード失敗時は認証失敗として扱う
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Secure Area", charset="UTF-8"',
    },
  });
}

export const config = {
  matcher: [
    /*
     * 全ルートを保護（社内ツールのため全ページロック）
     * _next/static, _next/image, favicon.ico は除外（Next.jsの静的アセット）
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
