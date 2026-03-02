import * as jose from "jose";

const JWT_ALG = "HS256";
const JWT_EXP = "7d";

export interface SessionPayload {
  id: string;
  email: string;
  role: "admin" | "viewer";
}

function getSecret(): Uint8Array | null {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    return null;
  }
  return new TextEncoder().encode(secret);
}

/**
 * ユーザー情報を含むJWTを発行
 */
export async function signToken(payload: SessionPayload): Promise<string> {
  const secret = getSecret();
  if (!secret) {
    throw new Error("JWT_SECRET が設定されていません（32文字以上必要）");
  }
  return new jose.SignJWT({ ...payload })
    .setProtectedHeader({ alg: JWT_ALG })
    .setExpirationTime(JWT_EXP)
    .setIssuedAt()
    .sign(secret);
}

/**
 * JWTを検証し、ペイロードを返す。無効な場合は null
 */
export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const secret = getSecret();
    if (!secret) return null;
    const { payload } = await jose.jwtVerify(token, secret);
    const id = payload.id as string;
    const email = payload.email as string;
    const role = payload.role as "admin" | "viewer";
    if (!id || !email || !role) return null;
    if (role !== "admin" && role !== "viewer") return null;
    return { id, email, role };
  } catch (err) {
    console.error("[auth] JWT 検証失敗:", err instanceof Error ? err.message : String(err));
    return null;
  }
}
