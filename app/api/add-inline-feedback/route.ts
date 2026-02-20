/**
 * インライン音声フィードバック API Route
 *
 * FormData を経由せず、生バイナリで受け取り R2 に直接アップロード。
 * FormData パースを回避し、Vercel ENOENT エラーを防ぐ。
 *
 * POST body: 音声ファイルの生バイナリ
 * Headers: x-recording-id, x-insert-after-index, x-file-ext
 */
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/src/lib/db";
import { getDictionaries } from "@/src/actions/dictionary-actions";
import { uploadToR2 } from "@/src/lib/r2";

function getMimeType(ext: string): string {
  const m: Record<string, string> = {
    webm: "audio/webm",
    mp3: "audio/mpeg",
    m4a: "audio/m4a",
    wav: "audio/wav",
    ogg: "audio/ogg",
  };
  return m[ext.toLowerCase()] || "audio/webm";
}

async function transcribeWithWhisper(
  buffer: Buffer,
  filename: string,
  contentType: string,
  prompt: string
) {
  const formData = new FormData();
  formData.append("file", new Blob([new Uint8Array(buffer)], { type: contentType }), filename);
  formData.append("model", "whisper-1");
  formData.append("language", "ja");
  formData.append("prompt", prompt);
  formData.append("response_format", "verbose_json");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Whisper API error: ${res.status} ${err}`);
  }
  return res.json();
}

export async function POST(request: NextRequest) {
  process.env.TMPDIR = "/tmp";
  process.env.TEMP = "/tmp";
  process.env.TMP = "/tmp";

  try {
    const recordingId = request.headers.get("x-recording-id");
    const insertAfterIndex = parseInt(
      request.headers.get("x-insert-after-index") ?? "-1",
      10
    );
    const fileExt = request.headers.get("x-file-ext") || "webm";

    if (!recordingId || insertAfterIndex < 0) {
      return NextResponse.json(
        { success: false, error: "パラメータが不正です" },
        { status: 400 }
      );
    }

    const bytes = await request.arrayBuffer();
    const buffer = Buffer.from(bytes);
    if (buffer.length === 0) {
      return NextResponse.json(
        { success: false, error: "音声データが空です" },
        { status: 400 }
      );
    }

    const timestamp = Date.now();
    const fileName = `feedback-inline-${timestamp}.${fileExt}`;
    const mimeType = getMimeType(fileExt);
    const r2Key = `uploads/${fileName}`;
    const audioUrl = await uploadToR2(buffer, fileName, mimeType);

    const dicts = await getDictionaries();
    const customTerms = dicts.map((d) => d.term).join(", ");
    const whisperPrompt =
      "こんにちは。ここは〇〇と深掘りすべきです。恐れ入ります、もう少しヒアリングを増やしましょう。受注、ローン、リース、月額制、SaaS、アポ、クロージング、架電、テーマ、導入。";
    const prompt = `${whisperPrompt} ${customTerms}`.trim();

    const transcription = await transcribeWithWhisper(
      buffer,
      fileName,
      mimeType,
      prompt
    );

    const text = transcription.text?.trim() ?? "";
    const duration = (transcription as { duration?: number }).duration ?? 0;
    const fileSize = buffer.length;

    const transcriptResult = await db.execute({
      sql: "SELECT id, content FROM transcripts WHERE recording_id = ? ORDER BY created_at DESC LIMIT 1",
      args: [recordingId],
    });

    if (transcriptResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "文字起こしが見つかりません" },
        { status: 404 }
      );
    }

    const row = transcriptResult.rows[0];
    const transcriptId = row.id as string;
    let content = row.content as string;

    let items: unknown[];
    try {
      const parsed = JSON.parse(content);
      items = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      items = [content];
    }

    const newFeedback = { type: "feedback", text, audioUrl };
    const insertIndex = Math.min(insertAfterIndex + 1, items.length);
    items.splice(insertIndex, 0, newFeedback);

    const newContent = JSON.stringify(items);
    await db.execute({
      sql: "UPDATE transcripts SET content = ? WHERE id = ?",
      args: [newContent, transcriptId],
    });

    // インライン指導を recordings に正式な子レコードとして追加
    const childRecordingId = `rec_fb_inline_${timestamp}`;
    const now = Date.now();
    await db.execute({
      sql: `INSERT INTO recordings (id, title, description, audio_url, r2_key, duration, file_size, recording_type, parent_id, category_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        childRecordingId,
        `インライン指導_${insertIndex + 1}`,
        text || "",
        audioUrl,
        r2Key,
        Math.floor(duration),
        fileSize,
        "feedback",
        recordingId,
        null,
        now,
        now,
      ],
    });

    revalidatePath("/recordings");

    return NextResponse.json({
      success: true,
      data: { newContent },
    });
  } catch (error) {
    console.error(
      "FULL_STACK_TRACE [add-inline-feedback]:",
      error instanceof Error ? error.stack : String(error)
    );
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "不明なエラーが発生しました",
      },
      { status: 500 }
    );
  }
}
