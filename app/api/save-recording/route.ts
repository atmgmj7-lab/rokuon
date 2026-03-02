/**
 * 録音メタデータの保存（音声ファイルは R2 に直接アップロード済みを想定）
 *
 * Vercel のペイロード制限を回避するため、ファイルはクライアントから R2 に直接 PUT。
 * この API は r2Key, transcript 等のメタデータのみを受け取り DB に保存する。
 *
 * POST body: { r2Key, audioUrl, title, description, rawTranscript, duration, fileSize }
 */
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/src/lib/db";
import { formatCallTranscript } from "@/src/actions/format-actions";
import { getSessionFromRequest } from "@/src/lib/auth-request";

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
    const r2Key = body?.r2Key as string;
    const audioUrl = body?.audioUrl as string;
    const title = (body?.title as string) || "";
    const description = (body?.description as string) || "";
    const rawTranscript = (body?.rawTranscript as string) || "";
    const duration = Number(body?.duration) || 0;
    const fileSize = Number(body?.fileSize) || 0;

    if (!r2Key?.trim() || !audioUrl?.trim()) {
      return NextResponse.json(
        { success: false, error: "r2Key と audioUrl は必須です" },
        { status: 400 }
      );
    }

    let contentToSave = rawTranscript;
    const formatResult = await formatCallTranscript(rawTranscript);
    if (formatResult.success && formatResult.json) {
      contentToSave = formatResult.json;
    }

    const timestamp = Date.now();
    const recordingId = `rec_${timestamp}`;
    const transcriptId = `trans_${timestamp}`;
    const now = Date.now();

    await db.execute({
      sql: `INSERT INTO recordings (id, title, description, audio_url, r2_key, duration, file_size, recording_type, parent_id, category_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        recordingId,
        title,
        description,
        audioUrl,
        r2Key,
        Math.floor(duration),
        fileSize,
        "case",
        null,
        null,
        now,
        now,
      ],
    });

    await db.execute({
      sql: `INSERT INTO transcripts (id, recording_id, content, original_content, language, created_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [transcriptId, recordingId, contentToSave, contentToSave, "ja", now],
    });

    revalidatePath("/");
    revalidatePath("/recordings");

    return NextResponse.json({
      success: true,
      data: {
        recordingId,
        transcriptId,
        audioUrl,
        transcript: contentToSave,
      },
    });
  } catch (error) {
    console.error("save-recording error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "録音の保存に失敗しました",
      },
      { status: 500 }
    );
  }
}
