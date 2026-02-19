/**
 * 指導音声アップロード API Route
 *
 * FormData を経由せず、リクエストボディを生バイナリとして受け取り R2 に直接アップロード。
 * FormData パースを回避し、Vercel ENOENT エラーを防ぐ。
 *
 * POST body: 音声ファイルの生バイナリ
 * Headers: x-file-name, x-title, x-description, x-parent-recording-id
 */
import { NextRequest, NextResponse } from "next/server";
// import { revalidatePath } from "next/cache";
import { db } from "@/src/lib/db";
import { getDictionaries } from "@/src/actions/dictionary-actions";
import { getCorrectionTerms } from "@/src/actions/correction-actions";
import { mergeFeedbackIntoTranscript } from "@/src/actions/format-actions";
import { uploadToR2 } from "@/src/lib/r2";

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
    ".ogg": "audio/ogg",
    ".mpeg": "audio/mpeg",
    ".mpga": "audio/mpeg",
  };
  return mimeTypes[extension.toLowerCase()] || "audio/webm";
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
    const safeDecode = (s: string) => {
      try {
        return decodeURIComponent(s);
      } catch {
        return s;
      }
    };
    const fileName = safeDecode(request.headers.get("x-file-name") || "recording.webm");
    const title = safeDecode(request.headers.get("x-title") || "");
    const description = safeDecode(request.headers.get("x-description") || "");
    const parentRecordingId = safeDecode(request.headers.get("x-parent-recording-id") || "");

    if (!parentRecordingId) {
      return NextResponse.json(
        { success: false, error: "親録音IDが指定されていません" },
        { status: 400 }
      );
    }

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
    const objectName = `feedback_${timestamp}${extension}`;
    const contentType = getMimeType(extension);

    const audioUrl = await uploadToR2(buffer, objectName, contentType);

    const dicts = await getDictionaries();
    const correctionTerms = await getCorrectionTerms();
    const customTerms = [
      ...dicts.map((d) => d.term),
      ...correctionTerms,
    ]
      .filter((t) => t && t.trim())
      .join(", ");
    const basePrompt =
      "こんにちは。ここは〇〇と深掘りすべきです。恐れ入ります、もう少しヒアリングを増やしましょう。受注、ローン、リース、月額制、SaaS、アポ、クロージング、架電、テーマ、導入。";
    const whisperPrompt = `${basePrompt} ${customTerms}`.trim();

    const transcription = await transcribeWithWhisper(
      buffer,
      objectName,
      contentType,
      whisperPrompt
    );

    const feedbackRawText = transcription.text ?? "";
    const duration = transcription.duration ?? 0;

    const parentTranscriptResult = await db.execute({
      sql: "SELECT content FROM transcripts WHERE recording_id = ? ORDER BY created_at DESC LIMIT 1",
      args: [parentRecordingId],
    });
    const parentTranscriptContent =
      parentTranscriptResult.rows.length > 0
        ? (parentTranscriptResult.rows[0].content as string)
        : "[]";

    let contentToSave = feedbackRawText;
    const mergeResult = await mergeFeedbackIntoTranscript(
      parentTranscriptContent,
      feedbackRawText
    );
    if (mergeResult.success && mergeResult.json) {
      contentToSave = mergeResult.json;
    }

    const recordingId = `rec_feedback_${timestamp}`;
    const transcriptId = `trans_feedback_${timestamp}`;
    const now = Date.now();

    await db.execute({
      sql: `INSERT INTO recordings (id, title, description, audio_url, duration, file_size, recording_type, parent_id, category_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        recordingId,
        title || `指導音声_${fileName}`,
        description || "",
        audioUrl,
        Math.floor(duration),
        fileSize,
        "feedback",
        parentRecordingId,
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
    // revalidatePath("/recordings");

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
    console.error(
      "FULL_STACK_TRACE [API feedback]:",
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
