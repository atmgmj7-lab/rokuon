/**
 * 音声アップロード＋文字起こし API Route
 *
 * FormData を経由せず、リクエストボディを生バイナリとして受け取り R2 に直接アップロード。
 * Vercel サーバーレスで FormData パース時の mkdir/public エラーを回避する。
 *
 * POST body: 音声ファイルの生バイナリ
 * Headers: x-file-name, x-title, x-description
 */
import { NextRequest, NextResponse } from "next/server";
// import { revalidatePath } from "next/cache"; // Vercel mkdir/public エラー回避のため一時停止
import { db } from "@/src/lib/db";
import { getDictionaries } from "@/src/actions/dictionary-actions";
import { getCorrectionTerms } from "@/src/actions/correction-actions";
import { formatCallTranscript } from "@/src/actions/format-actions";
import { uploadToR2 } from "@/src/lib/r2";
import OpenAI, { toFile } from "openai";

function getExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  return lastDot >= 0 ? filename.slice(lastDot) : "";
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
  return mimeTypes[extension.toLowerCase()] || "audio/mpeg";
}

const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  // 一時ファイルを /tmp に強制（Vercel で唯一書き込み可能なディレクトリ）
  process.env.TMPDIR = "/tmp";
  process.env.TEMP = "/tmp";
  process.env.TMP = "/tmp";

  try {
    const fileName = request.headers.get("x-file-name") || "audio.webm";
    const title = request.headers.get("x-title") || "";
    const description = request.headers.get("x-description") || "";

    // 生バイナリを取得（FormData パースを完全に回避）
    const bytes = await request.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileSize = buffer.length;

    if (fileSize === 0) {
      return NextResponse.json(
        { success: false, error: "音声ファイルが空です" },
        { status: 400 }
      );
    }

    const timestamp = Date.now();
    const extension = getExtension(fileName);
    const objectName = `${timestamp}${extension}`;
    const contentType = getMimeType(extension);

    // 1. R2 に直接アップロード（メモリ上の buffer のみ使用、fs 不使用）
    const audioUrl = await uploadToR2(buffer, objectName, contentType);

    // 2. Whisper: OpenAI toFile で完全メモリ形式（ディスク書き込みゼロ）
    const fileForWhisper = await toFile(buffer, objectName, {
      type: contentType,
    });

    const dicts = await getDictionaries();
    const correctionTerms = await getCorrectionTerms();
    const customTerms = [
      ...dicts.map((d) => d.term),
      ...correctionTerms,
    ]
      .filter((t) => t && t.trim())
      .join(", ");
    const basePrompt =
      "こんにちは。恐れ入ります、株式会社の〇〇と申します。よろしくお願いいたします。ローン、リース、受注、月額制、リフォーム、屋根工事、Googleマップ、SaaS、アポ、クロージング、架電、テーマ、導入、従量課金、固定費。";
    const whisperPrompt = `${basePrompt} ${customTerms}`.trim();

    const transcription = await openaiClient.audio.transcriptions.create({
      file: fileForWhisper,
      model: "whisper-1",
      language: "ja",
      prompt: whisperPrompt,
      response_format: "verbose_json",
    });

    const duration = transcription.duration ?? 0;
    const rawTranscript = transcription as {
      text?: string;
      segments?: { start: number; end: number; text: string }[];
    };
    let rawTranscriptText: string;
    if (
      rawTranscript.segments &&
      Array.isArray(rawTranscript.segments) &&
      rawTranscript.segments.length > 0
    ) {
      rawTranscriptText = rawTranscript.segments
        .map(
          (s) =>
            `[${s.start.toFixed(1)}s - ${s.end.toFixed(1)}s] ${(s.text ?? "").trim()}`
        )
        .filter((line) => {
          const afterBracket = line.indexOf("] ");
          return (
            afterBracket >= 0 &&
            line.slice(afterBracket + 2).trim().length > 0
          );
        })
        .join("\n");
      if (!rawTranscriptText.trim()) rawTranscriptText = rawTranscript.text ?? "";
    } else {
      rawTranscriptText = rawTranscript.text ?? "";
      if (rawTranscriptText && duration > 0) {
        rawTranscriptText = `[0.0s - ${duration.toFixed(1)}s] ${rawTranscriptText}`;
      }
    }

    let contentToSave = rawTranscriptText;
    const formatResult = await formatCallTranscript(rawTranscriptText);
    if (formatResult.success && formatResult.json) {
      contentToSave = formatResult.json;
    }

    const recordingId = `rec_${timestamp}`;
    const transcriptId = `trans_${timestamp}`;
    const now = Date.now();

    await db.execute({
      sql: `INSERT INTO recordings (id, title, description, audio_url, duration, file_size, recording_type, parent_id, category_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        recordingId,
        title || fileName,
        description || "",
        audioUrl,
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
      sql: `INSERT INTO transcripts (id, recording_id, content, language, created_at)
            VALUES (?, ?, ?, ?, ?)`,
      args: [transcriptId, recordingId, contentToSave, "ja", now],
    });

    // revalidatePath("/");

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
    console.error("FULL_STACK_TRACE [API upload]:", error instanceof Error ? error.stack : String(error));
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "不明なエラーが発生しました",
      },
      { status: 500 }
    );
  }
}
