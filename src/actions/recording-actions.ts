"use server";

import { db } from "@/src/lib/db";
import { getDictionaries } from "@/src/actions/dictionary-actions";
import { formatCallTranscript, mergeFeedbackIntoTranscript } from "@/src/actions/format-actions";
import { revalidatePath } from "next/cache";
import { writeFile, mkdir, readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import OpenAI, { toFile } from "openai";

const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// MIMEタイプを取得するヘルパー関数
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

export async function uploadAndTranscribe(formData: FormData) {
  try {
    // フォームから音声ファイルを取得
    const audioFile = formData.get("audio") as File;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;

    if (!audioFile) {
      return { success: false, error: "音声ファイルが選択されていません" };
    }

    // uploadsディレクトリを作成（存在しない場合）
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // ファイル名を生成（重複を避けるため）
    const timestamp = Date.now();
    const originalName = audioFile.name;
    const extension = path.extname(originalName);
    const fileName = `${timestamp}${extension}`;
    const filePath = path.join(uploadsDir, fileName);

    // ファイルをバッファに変換して保存
    const bytes = await audioFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // ファイルサイズを取得
    const fileSize = buffer.length;

    // Whisper APIで文字起こし
    console.log("🎧 Whisper APIで文字起こし中...");
    console.log(`📁 ファイルパス: ${filePath}`);
    console.log(`📝 ファイル名: ${fileName}`);
    console.log(`📏 拡張子: ${extension}`);

    // ユーザー辞書を取得し、prompt用にカンマ区切り文字列化
    const dicts = await getDictionaries();
    const customTerms = dicts.map((d) => d.term).join(", ");
    const basePrompt =
      "こんにちは。恐れ入ります、株式会社の〇〇と申します。よろしくお願いいたします。ローン、リース、受注、月額制、リフォーム、屋根工事、Googleマップ、SaaS、アポ、クロージング、架電、テーマ、導入、従量課金、固定費。";
    const whisperPrompt = `${basePrompt} ${customTerms}`.trim();

    const fileBuffer = await readFile(filePath);
    const file = await toFile(fileBuffer, fileName, {
      type: getMimeType(extension),
    });

    const transcription = await openaiClient.audio.transcriptions.create({
      file: file,
      model: "whisper-1",
      language: "ja",
      prompt: whisperPrompt,
      response_format: "verbose_json",
    });

    const duration = transcription.duration ?? 0;

    const rawTranscript = transcription as { text?: string; segments?: { start: number; end: number; text: string }[] };
    let rawTranscriptText: string;
    if (rawTranscript.segments && Array.isArray(rawTranscript.segments) && rawTranscript.segments.length > 0) {
      rawTranscriptText = rawTranscript.segments
        .map((s) => `[${s.start.toFixed(1)}s - ${s.end.toFixed(1)}s] ${(s.text ?? "").trim()}`)
        .filter((line) => {
          const afterBracket = line.indexOf("] ");
          return afterBracket >= 0 && line.slice(afterBracket + 2).trim().length > 0;
        })
        .join("\n");
      if (!rawTranscriptText.trim()) rawTranscriptText = rawTranscript.text ?? "";
      console.log("📋 [DEBUG] Whisper segments使用: タイムスタンプ付きテキストをGeminiへ渡します");
    } else {
      rawTranscriptText = rawTranscript.text ?? "";
      if (rawTranscriptText && duration > 0) {
        rawTranscriptText = `[0.0s - ${duration.toFixed(1)}s] ${rawTranscriptText}`;
        console.log("📋 [DEBUG] Whisper segmentsなし: 全体を [0.0s - Xs] でラップしてGeminiへ渡します");
      }
    }

    // Geminiで整形（JSON配列化・タイムスタンプ付き）
    let contentToSave = rawTranscriptText;
    const formatResult = await formatCallTranscript(rawTranscriptText);
    if (formatResult.success && formatResult.json) {
      contentToSave = formatResult.json;
    }
    console.log("💾 [DEBUG] DB保存前のフォーマット結果:", {
      success: formatResult.success,
      isJsonArray: (() => {
        try {
          const p = JSON.parse(contentToSave);
          return Array.isArray(p);
        } catch {
          return false;
        }
      })(),
      preview: contentToSave?.slice(0, 200),
    });

    console.log("✅ 文字起こし完了");

    // 録音データのIDを生成
    const recordingId = `rec_${timestamp}`;
    const transcriptId = `trans_${timestamp}`;
    const now = Date.now();

    // 音声ファイルのパブリックURL
    const audioUrl = `/uploads/${fileName}`;

    // recordingsテーブルにデータを挿入
    await db.execute({
      sql: `INSERT INTO recordings (id, title, description, audio_url, duration, file_size, recording_type, parent_id, category_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        recordingId,
        title || originalName,
        description || "",
        audioUrl,
        Math.floor(duration),
        fileSize,
        "case", // デフォルトは課題音声
        null, // parent_id
        null, // category_id
        now,
        now,
      ],
    });

    // transcriptsテーブルにデータを挿入（整形済みJSONを保存）
    await db.execute({
      sql: `INSERT INTO transcripts (id, recording_id, content, language, created_at)
            VALUES (?, ?, ?, ?, ?)`,
      args: [transcriptId, recordingId, contentToSave, "ja", now],
    });

    console.log("✅ データベースに保存完了");

    // ページを再検証
    revalidatePath("/");

    return {
      success: true,
      data: {
        recordingId,
        transcriptId,
        audioUrl,
        transcript: contentToSave,
      },
    };
  } catch (error) {
    console.error("❌ エラー:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "不明なエラーが発生しました",
    };
  }
}

// 指導音声をアップロード（課題音声に紐付け）
export async function uploadFeedback(formData: FormData, parentRecordingId: string) {
  try {
    const audioFile = formData.get("audio") as File;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;

    if (!audioFile) {
      return { success: false, error: "音声ファイルが選択されていません" };
    }

    // uploadsディレクトリを作成（存在しない場合）
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // ファイル名を生成
    const timestamp = Date.now();
    const originalName = audioFile.name;
    const extension = path.extname(originalName);
    const fileName = `feedback_${timestamp}${extension}`;
    const filePath = path.join(uploadsDir, fileName);

    // ファイルを保存
    const bytes = await audioFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);
    const fileSize = buffer.length;

    // Whisper APIで文字起こし（指導音声・ユーザー辞書を注入）
    console.log("🎧 指導音声をWhisper APIで文字起こし中...");

    const dicts = await getDictionaries();
    const customTerms = dicts.map((d) => d.term).join(", ");
    const basePrompt =
      "こんにちは。ここは〇〇と深掘りすべきです。恐れ入ります、もう少しヒアリングを増やしましょう。受注、ローン、リース、月額制、SaaS、アポ、クロージング、架電、テーマ、導入。";
    const whisperPrompt = `${basePrompt} ${customTerms}`.trim();

    const fileBuffer = await readFile(filePath);
    const file = await toFile(fileBuffer, fileName, {
      type: getMimeType(extension),
    });

    const transcription = await openaiClient.audio.transcriptions.create({
      file: file,
      model: "whisper-1",
      language: "ja",
      prompt: whisperPrompt,
      response_format: "verbose_json",
    });

    const feedbackRawText = transcription.text;
    const duration = transcription.duration ?? 0;

    // 親録音の商談テキスト（整形済みJSON）を取得
    const parentTranscriptResult = await db.execute({
      sql: "SELECT content FROM transcripts WHERE recording_id = ? ORDER BY created_at DESC LIMIT 1",
      args: [parentRecordingId],
    });
    const parentTranscriptContent =
      parentTranscriptResult.rows.length > 0
        ? (parentTranscriptResult.rows[0].content as string)
        : "[]";

    // Geminiでインライン結合
    let contentToSave = feedbackRawText;
    const mergeResult = await mergeFeedbackIntoTranscript(
      parentTranscriptContent,
      feedbackRawText
    );
    if (mergeResult.success && mergeResult.json) {
      contentToSave = mergeResult.json;
    }

    console.log("✅ 指導音声の文字起こし完了");

    // 録音データのIDを生成
    const recordingId = `rec_feedback_${timestamp}`;
    const transcriptId = `trans_feedback_${timestamp}`;
    const now = Date.now();
    const audioUrl = `/uploads/${fileName}`;

    // recordingsテーブルにデータを挿入（指導音声として）
    await db.execute({
      sql: `INSERT INTO recordings (id, title, description, audio_url, duration, file_size, recording_type, parent_id, category_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        recordingId,
        title || `指導音声_${originalName}`,
        description || "",
        audioUrl,
        Math.floor(duration),
        fileSize,
        "feedback", // 指導音声
        parentRecordingId, // 親の課題音声ID
        null,
        now,
        now,
      ],
    });

    // transcriptsテーブルにデータを挿入（マージ済みJSONを保存）
    await db.execute({
      sql: `INSERT INTO transcripts (id, recording_id, content, language, created_at)
            VALUES (?, ?, ?, ?, ?)`,
      args: [transcriptId, recordingId, contentToSave, "ja", now],
    });

    console.log("✅ 指導音声をデータベースに保存完了");

    revalidatePath("/recordings");

    return {
      success: true,
      data: {
        recordingId,
        transcriptId,
        audioUrl,
        transcript: contentToSave,
      },
    };
  } catch (error) {
    console.error("❌ エラー:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "不明なエラーが発生しました",
    };
  }
}

// すべての録音を取得（親子関係も含む）
export async function getAllRecordings() {
  try {
    const result = await db.execute(
      "SELECT * FROM recordings ORDER BY created_at DESC"
    );

    return result.rows.map((row) => ({
      id: row.id as string,
      title: row.title as string,
      description: row.description as string,
      audio_url: row.audio_url as string,
      duration: row.duration as number,
      file_size: row.file_size as number,
      recording_type: row.recording_type as string,
      parent_id: row.parent_id as string | null,
      category_id: row.category_id as string | null,
      custom_id: (row as { custom_id?: string }).custom_id as string | undefined,
      created_at: row.created_at as number,
      updated_at: row.updated_at as number,
    }));
  } catch (error) {
    console.error("❌ 録音取得エラー:", error);
    return [];
  }
}

// 特定の録音を取得
export async function getRecordingById(recordingId: string) {
  try {
    const result = await db.execute({
      sql: "SELECT * FROM recordings WHERE id = ?",
      args: [recordingId],
    });

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id as string,
      title: row.title as string,
      description: row.description as string,
      audio_url: row.audio_url as string,
      duration: row.duration as number,
      file_size: row.file_size as number,
      recording_type: row.recording_type as string,
      parent_id: row.parent_id as string | null,
      category_id: row.category_id as string | null,
      custom_id: (row as { custom_id?: string }).custom_id as string | undefined,
      created_at: row.created_at as number,
      updated_at: row.updated_at as number,
    };
  } catch (error) {
    console.error("❌ 録音取得エラー:", error);
    return null;
  }
}

// 録音の文字起こしを取得
export async function getTranscriptByRecordingId(recordingId: string) {
  try {
    const result = await db.execute({
      sql: "SELECT * FROM transcripts WHERE recording_id = ? ORDER BY created_at DESC LIMIT 1",
      args: [recordingId],
    });

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id as string,
      recording_id: row.recording_id as string,
      content: row.content as string,
      language: row.language as string | null,
      created_at: row.created_at as number,
    };
  } catch (error) {
    console.error("❌ 文字起こし取得エラー:", error);
    return null;
  }
}

// 録音のcustom_idを更新
export async function updateRecordingCustomId(recordingId: string, customId: string) {
  try {
    await db.execute({
      sql: "UPDATE recordings SET custom_id = ?, updated_at = ? WHERE id = ?",
      args: [customId || null, Date.now(), recordingId],
    });
    revalidatePath("/recordings");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("❌ 録音更新エラー:", error);
    return { success: false, error: error instanceof Error ? error.message : "不明なエラー" };
  }
}

// 文字起こしを更新
export async function updateTranscript(transcriptId: string, content: string) {
  try {
    await db.execute({
      sql: "UPDATE transcripts SET content = ? WHERE id = ?",
      args: [content, transcriptId],
    });

    return { success: true };
  } catch (error) {
    console.error("❌ 文字起こし更新エラー:", error);
    return { success: false, error: error instanceof Error ? error.message : "不明なエラー" };
  }
}

// 録音データを削除（transcripts は ON DELETE CASCADE で自動削除）
export async function deleteRecording(recordingId: string) {
  try {
    await db.execute({
      sql: "DELETE FROM recordings WHERE id = ?",
      args: [recordingId],
    });
    revalidatePath("/recordings");
    return { success: true };
  } catch (error) {
    console.error("❌ 録音削除エラー:", error);
    return { success: false, error: error instanceof Error ? error.message : "不明なエラー" };
  }
}

// 文字起こしの内容を更新（JSON文字列を直接保存）
export async function updateTranscriptContent(transcriptId: string, newContent: string) {
  try {
    await db.execute({
      sql: "UPDATE transcripts SET content = ? WHERE id = ?",
      args: [newContent, transcriptId],
    });
    revalidatePath("/recordings");
    return { success: true };
  } catch (error) {
    console.error("❌ 文字起こし更新エラー:", error);
    return { success: false, error: error instanceof Error ? error.message : "不明なエラー" };
  }
}
