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

// 録音を検索（キーワード・音声カテゴリでサーバーサイドフィルタ）※ワークスペースカテゴリは使用しない
export async function searchRecordings(
  query?: string,
  _categoryId?: string,
  audioCategoryId?: string
) {
  try {
    let sql = `
      SELECT DISTINCT r.*, ac.name as audio_category_name
      FROM recordings r
      LEFT JOIN audio_categories ac ON r.audio_category_id = ac.id
      LEFT JOIN transcripts t ON t.recording_id = r.id
      WHERE r.parent_id IS NULL
        AND (r.is_deleted = 0 OR r.is_deleted IS NULL)
        AND (r.is_archived_training_data = 0 OR r.is_archived_training_data IS NULL)
    `;
    const args: (string | number)[] = [];

    if (query?.trim()) {
      sql += ` AND (r.title LIKE ? OR r.memo LIKE ? OR r.description LIKE ? OR (t.content IS NOT NULL AND t.content LIKE ?))`;
      const q = `%${query.trim()}%`;
      args.push(q, q, q, q);
    }
    if (audioCategoryId?.trim()) {
      sql += ` AND r.audio_category_id = ?`;
      args.push(audioCategoryId.trim());
    }
    sql += ` ORDER BY r.created_at DESC`;

    const result = await db.execute({ sql, args });

    return result.rows.map((row) => ({
      id: row.id as string,
      title: row.title as string,
      description: row.description as string,
      audio_url: row.audio_url as string,
      duration: row.duration as number,
      file_size: row.file_size as number,
      recording_type: row.recording_type as string,
      parent_id: row.parent_id as string | null,
      custom_id: (row as { custom_id?: string }).custom_id as string | undefined,
      memo: (row as { memo?: string }).memo as string | undefined,
      audio_category_id: (row as { audio_category_id?: string }).audio_category_id as string | undefined,
      audio_category: (row as { audio_category_name?: string }).audio_category_name as string | undefined,
      is_training_data: !!((row as { is_training_data?: number }).is_training_data),
      created_at: row.created_at as number,
      updated_at: row.updated_at as number,
    }));
  } catch (error) {
    console.error("❌ 録音検索エラー:", error);
    return [];
  }
}

// すべての録音を取得（親子関係も含む）
export async function getAllRecordings() {
  try {
    const result = await db.execute(
      `SELECT r.*, ac.name as audio_category_name FROM recordings r
       LEFT JOIN audio_categories ac ON r.audio_category_id = ac.id
       WHERE (r.is_deleted = 0 OR r.is_deleted IS NULL)
         AND (r.is_archived_training_data = 0 OR r.is_archived_training_data IS NULL)
       ORDER BY r.created_at DESC`
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
      custom_id: (row as { custom_id?: string }).custom_id as string | undefined,
      memo: (row as { memo?: string }).memo as string | undefined,
      audio_category_id: (row as { audio_category_id?: string }).audio_category_id as string | undefined,
      audio_category: (row as { audio_category_name?: string }).audio_category_name as string | undefined,
      is_training_data: !!((row as { is_training_data?: number }).is_training_data),
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
      sql: `SELECT r.*, ac.name as audio_category_name FROM recordings r
            LEFT JOIN audio_categories ac ON r.audio_category_id = ac.id
            WHERE r.id = ?`,
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
      custom_id: (row as { custom_id?: string }).custom_id as string | undefined,
      memo: (row as { memo?: string }).memo as string | undefined,
      audio_category_id: (row as { audio_category_id?: string }).audio_category_id as string | undefined,
      audio_category: (row as { audio_category_name?: string }).audio_category_name as string | undefined,
      is_training_data: !!((row as { is_training_data?: number }).is_training_data),
      created_at: row.created_at as number,
      updated_at: row.updated_at as number,
    };
  } catch (error) {
    console.error("❌ 録音取得エラー:", error);
    return null;
  }
}

// 録音の音声カテゴリ（audio_category_id）を更新
export async function updateRecordingAudioCategory(
  recordingId: string,
  audioCategoryId: string | null
) {
  try {
    await db.execute({
      sql: "UPDATE recordings SET audio_category_id = ?, updated_at = ? WHERE id = ?",
      args: [audioCategoryId?.trim() || null, Date.now(), recordingId],
    });
    return { success: true };
  } catch (error) {
    console.error("❌ 音声カテゴリ更新エラー:", error);
    return { success: false, error: error instanceof Error ? error.message : "不明なエラー" };
  }
}

// 録音を学習データとして登録/解除（指導音声ペア用）
export async function setRecordingTrainingData(recordingId: string, isTraining: boolean) {
  try {
    await db.execute({
      sql: "UPDATE recordings SET is_training_data = ?, updated_at = ? WHERE id = ?",
      args: [isTraining ? 1 : 0, Date.now(), recordingId],
    });
    return { success: true };
  } catch (error) {
    console.error("❌ 学習データ設定エラー:", error);
    return { success: false, error: error instanceof Error ? error.message : "不明なエラー" };
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

// 録音の文字起こしを取得（corrected_content があれば表示用に使用）
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
    const corrected = (row as { corrected_content?: string }).corrected_content as string | undefined;
    const content = row.content as string;
    return {
      id: row.id as string,
      recording_id: row.recording_id as string,
      content: corrected ?? content,
      original_content: (row as { original_content?: string }).original_content as string | undefined,
      corrected_content: corrected,
      learning_pending: (row as { learning_pending?: number }).learning_pending as number | undefined,
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

// 録音データを論理削除（ゴミ箱へ移動）
export async function deleteRecording(recordingId: string) {
  try {
    await db.execute({
      sql: "UPDATE recordings SET is_deleted = 1, updated_at = ? WHERE id = ?",
      args: [Date.now(), recordingId],
    });
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
    return { success: true };
  } catch (error) {
    console.error("❌ 文字起こし更新エラー:", error);
    return { success: false, error: error instanceof Error ? error.message : "不明なエラー" };
  }
}

// 修正テキストを corrected_content に保存（学習用）
export async function saveCorrectedTranscript(transcriptId: string, correctedContent: string) {
  try {
    await db.execute({
      sql: "UPDATE transcripts SET content = ?, corrected_content = ? WHERE id = ?",
      args: [correctedContent, correctedContent, transcriptId],
    });
    return { success: true };
  } catch (error) {
    console.error("❌ 修正テキスト保存エラー:", error);
    return { success: false, error: error instanceof Error ? error.message : "不明なエラー" };
  }
}

// 学習待ちステータスに設定
export async function setTranscriptLearningPending(transcriptId: string) {
  try {
    await db.execute({
      sql: "UPDATE transcripts SET learning_pending = 1 WHERE id = ?",
      args: [transcriptId],
    });
    return { success: true };
  } catch (error) {
    console.error("❌ 学習フラグ設定エラー:", error);
    return { success: false, error: error instanceof Error ? error.message : "不明なエラー" };
  }
}
