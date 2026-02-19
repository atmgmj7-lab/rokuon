/**
 * 録音音声の再生用URLを返す API
 * - r2_key がある場合: 署名付きURLへリダイレクト（プライベートバケット・S3 API エンドポイント対応）
 * - r2_key がない場合: audio_url からキーを抽出して署名付きURLを試行、失敗時は audio_url へリダイレクト
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/lib/db";
import { getSignedAudioUrl, isR2PublicUrlS3Endpoint } from "@/src/lib/r2";

const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "";

function extractR2KeyFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname;
    if (!pathname || pathname === "/") return null;
    const segments = pathname.slice(1).split("/");
    if (segments.length < 2) return null;
    if (segments[0] === R2_BUCKET_NAME) return segments.slice(1).join("/");
    return segments.join("/");
  } catch {
    return null;
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Recording ID required" }, { status: 400 });
    }

    const result = await db.execute({
      sql: "SELECT r2_key, audio_url FROM recordings WHERE id = ?",
      args: [id],
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Recording not found" }, { status: 404 });
    }

    const row = result.rows[0];
    let r2Key = (row.r2_key as string | null | undefined)?.trim() || null;
    const audioUrl = (row.audio_url as string)?.trim();

    if (!r2Key && audioUrl) {
      r2Key = extractR2KeyFromUrl(audioUrl);
    }

    if (r2Key && isR2PublicUrlS3Endpoint()) {
      const signedUrl = await getSignedAudioUrl(r2Key);
      return NextResponse.redirect(signedUrl, 302);
    }

    if (audioUrl) {
      return NextResponse.redirect(audioUrl, 302);
    }

    return NextResponse.json({ error: "No audio URL available" }, { status: 404 });
  } catch (error) {
    console.error("[API recordings/audio] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
