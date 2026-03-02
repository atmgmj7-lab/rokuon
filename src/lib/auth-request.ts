/**
 * リクエストから JWT を取得するヘルパー
 * Cookie (scouter_session) または Authorization: Bearer <token> をサポート
 */
import type { NextRequest } from "next/server";
import { verifyToken } from "./auth";

export async function getTokenFromRequest(request: NextRequest): Promise<string | null> {
  // 1. Authorization: Bearer <token>
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token) return token;
  }

  // 2. Cookie (scouter_session)
  const cookieToken = request.cookies.get("scouter_session")?.value;
  if (cookieToken) return cookieToken;

  return null;
}

/**
 * リクエストから検証済みセッションを取得
 */
export async function getSessionFromRequest(request: NextRequest) {
  const token = await getTokenFromRequest(request);
  if (!token) return null;
  return verifyToken(token);
}
