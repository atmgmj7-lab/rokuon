/**
 * R2 直接アップロード用の署名付き PUT URL を発行
 *
 * Vercel のペイロード制限を回避するため、クライアントがこの URL に直接 PUT でアップロードする。
 *
 * POST body: { filename: string, contentType: string }
 * Response: { putUrl, r2Key, audioUrl }
 */
import { NextRequest, NextResponse } from "next/server";
import { getPresignedPutUrl } from "@/src/lib/r2";
import { getSessionFromRequest } from "@/src/lib/auth-request";

function getExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  return lastDot >= 0 ? filename.slice(lastDot) : ".webm";
}

function getMimeType(extension: string): string {
  const mimeTypes: Record<string, string> = {
    ".mp3": "audio/mpeg",
    ".mp4": "audio/mp4",
    ".m4a": "audio/m4a",
    ".wav": "audio/wav",
    ".webm": "audio/webm",
    ".mpeg": "audio/mpeg",
    ".mpga": "audio/mpeg",
  };
  return mimeTypes[extension.toLowerCase()] || "audio/webm";
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || session.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "この操作は管理者のみ行えます" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const filename = (body?.filename as string) || "audio.webm";
    const contentType = (body?.contentType as string) || "audio/webm";

    const extension = getExtension(filename);
    const mimeType = contentType || getMimeType(extension);
    const timestamp = Date.now();
    const objectName = `${timestamp}${extension}`;
    const r2Key = `uploads/${objectName}`;

    const putUrl = await getPresignedPutUrl(r2Key, mimeType);

    const baseUrl = (process.env.R2_PUBLIC_URL || "").replace(/\/$/, "");
    const audioUrl = baseUrl ? `${baseUrl}/${r2Key}` : "";

    return NextResponse.json({
      success: true,
      putUrl,
      r2Key,
      audioUrl,
    });
  } catch (error) {
    console.error("upload-presigned error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "署名付きURLの生成に失敗しました",
      },
      { status: 500 }
    );
  }
}
