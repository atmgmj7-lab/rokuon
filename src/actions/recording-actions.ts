"use server";

import { db } from "@/src/lib/db";
import { revalidatePath } from "next/cache";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import OpenAI, { toFile } from "openai";
import { readFile } from "fs/promises";

const openai = new OpenAI({
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
    
    // ファイルを読み込んでtoFileヘルパーで渡す
    const fileBuffer = await readFile(filePath);
    const file = await toFile(fileBuffer, fileName, {
      type: getMimeType(extension),
    });
    
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: "whisper-1",
      language: "ja",
      prompt: "テレアポの逐語録です。フィラー（えー、あのー）は残しつつ、正確に書き起こして。",
      response_format: "verbose_json",
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
        Math.floor(transcription.duration || 0),
        fileSize,
        "case", // デフォルトは課題音声
        null, // parent_id
        null, // category_id
        now,
        now,
      ],
    });

    // transcriptsテーブルにデータを挿入
    await db.execute({
      sql: `INSERT INTO transcripts (id, recording_id, content, language, created_at)
            VALUES (?, ?, ?, ?, ?)`,
      args: [
        transcriptId,
        recordingId,
        transcription.text,
        transcription.language || "ja",
        now,
      ],
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
        transcript: transcription.text,
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

    // Whisper APIで文字起こし
    console.log("🎧 指導音声をWhisper APIで文字起こし中...");
    
    const fileBuffer = await readFile(filePath);
    const file = await toFile(fileBuffer, fileName, {
      type: getMimeType(extension),
    });
    
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: "whisper-1",
      language: "ja",
      prompt: "マネージャーによる指導音声です。新人へのフィードバック内容を正確に書き起こして。",
      response_format: "verbose_json",
    });

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
        Math.floor(transcription.duration || 0),
        fileSize,
        "feedback", // 指導音声
        parentRecordingId, // 親の課題音声ID
        null,
        now,
        now,
      ],
    });

    // transcriptsテーブルにデータを挿入
    await db.execute({
      sql: `INSERT INTO transcripts (id, recording_id, content, language, created_at)
            VALUES (?, ?, ?, ?, ?)`,
      args: [
        transcriptId,
        recordingId,
        transcription.text,
        transcription.language || "ja",
        now,
      ],
    });

    console.log("✅ 指導音声をデータベースに保存完了");

    revalidatePath("/recordings");

    return {
      success: true,
      data: {
        recordingId,
        transcriptId,
        audioUrl,
        transcript: transcription.text,
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
      created_at: row.created_at as number,
      updated_at: row.updated_at as number,
    };
  } catch (error) {
    console.error("❌ 録音取得エラー:", error);
    return null;
  }
}
