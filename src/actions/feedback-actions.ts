"use server";

import { db } from "@/src/lib/db";
import { requireAdminOrError } from "@/src/actions/auth-actions";
import { getDictionaries } from "@/src/actions/dictionary-actions";
import { uploadToR2 } from "@/src/lib/r2";
// import { revalidatePath } from "next/cache";
import OpenAI from "openai";

const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

export async function addInlineVoiceFeedback(
  recordingId: string,
  insertAfterIndex: number,
  formData: FormData
) {
  const authErr = await requireAdminOrError();
  if (authErr) return authErr;
  try {
    const file = formData.get("audio") as File;
    if (!file) {
      return { success: false, error: "音声ファイルがありません" };
    }

    const originalName = file.name || "recording.webm";
    const extMatch = originalName.match(/\.([^.]+)$/);
    const ext = extMatch ? extMatch[1].toLowerCase() : "webm";

    const fileName = `feedback-inline-${Date.now()}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. Cloudflare R2 にアップロード
    const mimeType = getMimeType(`.${ext}`);
    const audioUrl = await uploadToR2(buffer, fileName, mimeType);

    // 2. Whisperで文字起こし
    const dicts = await getDictionaries();
    const customTerms = dicts.map((d) => d.term).join(", ");
    const whisperPrompt =
      "こんにちは。ここは〇〇と深掘りすべきです。恐れ入ります、もう少しヒアリングを増やしましょう。受注、ローン、リース、月額制、SaaS、アポ、クロージング、架電、テーマ、導入。";
    const prompt = `${whisperPrompt} ${customTerms}`.trim();

    // FormData の File をそのまま Whisper に渡す（ローカルファイルシステムは一切使用しない）
    const transcription = await openaiClient.audio.transcriptions.create({
      file: file,
      model: "whisper-1",
      language: "ja",
      prompt,
    });

    const text = transcription.text?.trim() ?? "";

    // 3. DBから該当 recordingId の transcript を取得
    const transcriptResult = await db.execute({
      sql: "SELECT id, content FROM transcripts WHERE recording_id = ? ORDER BY created_at DESC LIMIT 1",
      args: [recordingId],
    });

    if (transcriptResult.rows.length === 0) {
      return { success: false, error: "文字起こしが見つかりません" };
    }

    const row = transcriptResult.rows[0];
    const transcriptId = row.id as string;
    let content = row.content as string;

    // 4. JSONをパースして配列に変換
    let items: unknown[];
    try {
      const parsed = JSON.parse(content);
      items = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      items = [content];
    }

    // 5. 新しいフィードバックブロックを挿入（audioUrl は R2 の公開URL）
    const newFeedback = {
      type: "feedback",
      text,
      audioUrl,
    };

    const insertIndex = Math.min(insertAfterIndex + 1, items.length);
    items.splice(insertIndex, 0, newFeedback);

    // 6. DBの transcript を更新
    const newContent = JSON.stringify(items);
    await db.execute({
      sql: "UPDATE transcripts SET content = ? WHERE id = ?",
      args: [newContent, transcriptId],
    });

    // revalidatePath("/");
    // revalidatePath("/recordings");

    return {
      success: true,
      data: { newContent },
    };
  } catch (error) {
    console.error("FULL_STACK_TRACE:", error instanceof Error ? error.stack : String(error));
    console.error("フィードバック保存エラー:", error);
    throw error;
  }
}

export async function deleteInlineVoiceFeedback(
  recordingId: string,
  indexToDelete: number
) {
  const authErr = await requireAdminOrError();
  if (authErr) return authErr;
  try {
    const transcriptResult = await db.execute({
      sql: "SELECT id, content FROM transcripts WHERE recording_id = ? ORDER BY created_at DESC LIMIT 1",
      args: [recordingId],
    });

    if (transcriptResult.rows.length === 0) {
      return { success: false, error: "文字起こしが見つかりません" };
    }

    const row = transcriptResult.rows[0];
    const transcriptId = row.id as string;
    let content = row.content as string;

    let items: unknown[];
    try {
      const parsed = JSON.parse(content);
      items = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return { success: false, error: "文字起こしの形式が不正です" };
    }

    if (indexToDelete < 0 || indexToDelete >= items.length) {
      return { success: false, error: "指定されたインデックスが範囲外です" };
    }

    items.splice(indexToDelete, 1);
    const newContent = JSON.stringify(items);

    await db.execute({
      sql: "UPDATE transcripts SET content = ? WHERE id = ?",
      args: [newContent, transcriptId],
    });

    // revalidatePath("/");
    // revalidatePath("/recordings");

    return {
      success: true,
      data: { newContent },
    };
  } catch (error) {
    console.error("フィードバック削除エラー:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "不明なエラーが発生しました",
    };
  }
}
