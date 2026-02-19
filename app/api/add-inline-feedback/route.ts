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
import { db } from "@/src/lib/db";
import { getDictionaries } from "@/src/actions/dictionary-actions";
import { uploadToR2 } from "@/src/lib/r2";
import OpenAI, { toFile } from "openai";

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

const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

    const fileName = `feedback-inline-${Date.now()}.${fileExt}`;
    const mimeType = getMimeType(fileExt);
    const audioUrl = await uploadToR2(buffer, fileName, mimeType);

    const fileForWhisper = await toFile(buffer, fileName, { type: mimeType });

    const dicts = await getDictionaries();
    const customTerms = dicts.map((d) => d.term).join(", ");
    const whisperPrompt =
      "こんにちは。ここは〇〇と深掘りすべきです。恐れ入ります、もう少しヒアリングを増やしましょう。受注、ローン、リース、月額制、SaaS、アポ、クロージング、架電、テーマ、導入。";
    const prompt = `${whisperPrompt} ${customTerms}`.trim();

    const transcription = await openaiClient.audio.transcriptions.create({
      file: fileForWhisper,
      model: "whisper-1",
      language: "ja",
      prompt,
    });

    const text = transcription.text?.trim() ?? "";

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
