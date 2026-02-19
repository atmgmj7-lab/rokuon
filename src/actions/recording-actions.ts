"use server";

import { db } from "@/src/lib/db";

/** @deprecated 使用禁止。API Route /api/upload-and-transcribe を使用してください。 */
export async function uploadAndTranscribe(_formData: FormData) {
  return { success: false, error: "この機能は廃止されました。ページを再読み込みしてください。" };
}

/** @deprecated 使用禁止。API Route /api/upload-feedback を使用してください。 */
export async function uploadFeedback(_formData: FormData, _parentRecordingId: string) {
  return { success: false, error: "この機能は廃止されました。ページを再読み込みしてください。" };
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
      memo: (row as { memo?: string }).memo as string | undefined,
      category: (row as { category?: string }).category as string | undefined,
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
      memo: (row as { memo?: string }).memo as string | undefined,
      category: (row as { category?: string }).category as string | undefined,
      created_at: row.created_at as number,
      updated_at: row.updated_at as number,
    };
  } catch (error) {
    console.error("❌ 録音取得エラー:", error);
    return null;
  }
}

// 録音のメモを更新
export async function updateRecordingMemo(recordingId: string, memo: string) {
  try {
    await db.execute({
      sql: "UPDATE recordings SET memo = ?, updated_at = ? WHERE id = ?",
      args: [memo || null, Date.now(), recordingId],
    });
    // revalidatePath("/recordings");
    // revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("❌ メモ更新エラー:", error);
    return { success: false, error: error instanceof Error ? error.message : "不明なエラー" };
  }
}

// 録音のカテゴリを更新
export async function updateRecordingCategory(recordingId: string, category: string) {
  try {
    await db.execute({
      sql: "UPDATE recordings SET category = ?, updated_at = ? WHERE id = ?",
      args: [category?.trim() || null, Date.now(), recordingId],
    });
    // revalidatePath("/recordings");
    // revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("❌ カテゴリ更新エラー:", error);
    return { success: false, error: error instanceof Error ? error.message : "不明なエラー" };
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
    // revalidatePath("/recordings");
    // revalidatePath("/");
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
    // revalidatePath("/recordings");
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
    // revalidatePath("/recordings");
    return { success: true };
  } catch (error) {
    console.error("❌ 文字起こし更新エラー:", error);
    return { success: false, error: error instanceof Error ? error.message : "不明なエラー" };
  }
}
