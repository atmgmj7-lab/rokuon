/**
 * R2 音声の署名付きURLへリダイレクトする API
 * フィードバック音声など、audio_url が直接 R2 URL の場合に使用。
 * クエリ: url= にエンコードされた R2 の audio_url を渡す。
 */
import { NextRequest, NextResponse } from "next/server";
import { getSignedAudioUrl, isR2PublicUrlS3Endpoint } from "@/src/lib/r2";

const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || "";
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "";

/** URL から R2 オブジェクトキーを抽出 */
function extractR2KeyFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname;
    if (!pathname || pathname === "/") return null;
    // pathname: /record/uploads/xxx または /uploads/xxx (r2.dev)
    const segments = pathname.slice(1).split("/");
    if (segments.length < 2) return null;
    // バケット名が含まれる場合: record/uploads/xxx → uploads/xxx
    if (segments[0] === R2_BUCKET_NAME) {
      return segments.slice(1).join("/");
    }
    return segments.join("/");
  } catch {
    return null;
  }
}

/** 自社 R2 の URL かどうか検証（R2_PUBLIC_URL または r2.dev 形式） */
function isOwnR2Url(url: string): boolean {
  if (!url?.startsWith("http")) return false;
  try {
    const u = new URL(url);
    if (R2_PUBLIC_URL && (url.startsWith(R2_PUBLIC_URL) || u.origin === new URL(R2_PUBLIC_URL).origin)) {
      return true;
    }
    if (u.hostname.endsWith(".r2.dev")) return true;
    return false;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    const urlParam = request.nextUrl.searchParams.get("url");
    if (!urlParam) {
      return NextResponse.json({ error: "url parameter required" }, { status: 400 });
    }

    const originalUrl = decodeURIComponent(urlParam);
    if (!isOwnR2Url(originalUrl)) {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    const r2Key = extractR2KeyFromUrl(originalUrl);
    if (!r2Key) {
      return NextResponse.json({ error: "Could not extract R2 key from URL" }, { status: 400 });
    }

    if (!isR2PublicUrlS3Endpoint()) {
      return NextResponse.redirect(originalUrl, 302);
    }

    const signedUrl = await getSignedAudioUrl(r2Key);
    return NextResponse.redirect(signedUrl, 302);
  } catch (error) {
    console.error("[API audio/signed] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
