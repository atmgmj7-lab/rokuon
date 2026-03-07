/**
 * マインドマップノード用の音声アップロード / 削除 API
 * /api/upload-presigned と異なり admin ロール不要（認証済みユーザーなら使用可）
 */
import { NextRequest, NextResponse } from "next/server";
import { getPresignedPutUrl, deleteFromR2 } from "@/src/lib/r2";
import { getSessionFromRequest } from "@/src/lib/auth-request";

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ success: false, error: "認証が必要です" }, { status: 401 });
  }

  try {
    const body = await request.json() as { filename?: string; contentType?: string };
    const filename    = body.filename    ?? "audio.webm";
    const contentType = body.contentType ?? "audio/webm";

    const lastDot = filename.lastIndexOf(".");
    const ext     = lastDot >= 0 ? filename.slice(lastDot) : ".webm";
    const r2Key   = `uploads/mindmap_${Date.now()}${ext}`;

    const putUrl  = await getPresignedPutUrl(r2Key, contentType);
    const baseUrl = (process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "");

    if (!baseUrl) {
      return NextResponse.json(
        { success: false, error: "R2_PUBLIC_URL が未設定です" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, putUrl, r2Key, audioUrl: `${baseUrl}/${r2Key}` });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "署名付きURL生成に失敗しました" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ success: false, error: "認証が必要です" }, { status: 401 });
  }

  try {
    const { r2Key } = await request.json() as { r2Key?: string };
    if (!r2Key) {
      return NextResponse.json({ success: false, error: "r2Key が必要です" }, { status: 400 });
    }
    await deleteFromR2(r2Key);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "削除に失敗しました" },
      { status: 500 }
    );
  }
}
