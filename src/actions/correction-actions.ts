"use server";

import { db } from "@/src/lib/db";

export type CorrectionInput = {
  original_text: string;
  corrected_text: string;
};

/**
 * 文字起こし修正履歴をDBに保存（Human-in-the-Loop）
 * ユーザーが編集した Before/After を transcript_corrections に蓄積
 */
export async function saveTranscriptCorrections(
  recordingId: string,
  transcriptId: string,
  corrections: CorrectionInput[]
) {
  if (!recordingId || corrections.length === 0) {
    return { success: true };
  }

  const validCorrections = corrections.filter(
    (c) =>
      c.original_text.trim() !== c.corrected_text.trim() &&
      c.corrected_text.trim().length > 0
  );

  if (validCorrections.length === 0) {
    return { success: true };
  }

  try {
    const now = Date.now();

    for (const c of validCorrections) {
      const id = `corr_${now}_${crypto.randomUUID().slice(0, 8)}`;
      await db.execute({
        sql: `INSERT INTO transcript_corrections (id, recording_id, transcript_id, original_text, corrected_text, created_at)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [
          id,
          recordingId,
          transcriptId,
          c.original_text.trim(),
          c.corrected_text.trim(),
          now,
        ],
      });
    }

    return { success: true };
  } catch (error) {
    console.error("❌ 修正履歴保存エラー:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "不明なエラー",
    };
  }
}

export type TranscriptCorrection = {
  id: string;
  recording_id: string;
  transcript_id: string | null;
  original_text: string;
  corrected_text: string;
  created_at: number;
};

/**
 * 修正履歴一覧を取得（学習データ閲覧用）
 */
export async function getTranscriptCorrections(): Promise<TranscriptCorrection[]> {
  try {
    const result = await db.execute({
      sql: `SELECT id, recording_id, transcript_id, original_text, corrected_text, created_at
            FROM transcript_corrections
            ORDER BY created_at DESC`,
      args: [],
    });

    return result.rows.map((row) => ({
      id: row.id as string,
      recording_id: row.recording_id as string,
      transcript_id: (row.transcript_id as string) ?? null,
      original_text: (row.original_text as string) ?? "",
      corrected_text: (row.corrected_text as string) ?? "",
      created_at: row.created_at as number,
    }));
  } catch (error) {
    console.error("❌ 修正履歴取得エラー:", error);
    return [];
  }
}

/**
 * Whisper APIの prompt 用に、蓄積された修正後の単語・フレーズを取得
 * 直近の corrected_text を重複排除して返す（最大100件）
 */
export async function getCorrectionTerms(): Promise<string[]> {
  try {
    const result = await db.execute({
      sql: `SELECT DISTINCT corrected_text FROM transcript_corrections
            WHERE corrected_text IS NOT NULL AND corrected_text != ''
            ORDER BY created_at DESC
            LIMIT 100`,
      args: [],
    });

    const terms = result.rows
      .map((row) => (row.corrected_text as string)?.trim())
      .filter((t): t is string => !!t && t.length > 0);

    // 重複排除（大文字小文字無視は不要、日本語なので）
    return [...new Set(terms)];
  } catch (error) {
    console.error("❌ 修正用語取得エラー:", error);
    return [];
  }
}
