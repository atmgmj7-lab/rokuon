"use server";

import { db } from "@/src/lib/db";
import { deleteFromR2 } from "@/src/lib/r2";

const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "";

function extractR2KeyFromUrl(url: string): string | null {
  if (!url?.trim()) return null;
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname;
    if (!pathname || pathname === "/") return null;
    const segments = pathname.slice(1).split("/");
    if (segments.length < 2) return null;
    if (segments[0] === R2_BUCKET_NAME) return segments.slice(1).join("/");
    return segments.join("/");
  } catch {
    return null;
  }
}

export type TrashRecording = {
  id: string;
  title: string;
  description: string;
  audio_url: string;
  duration: number;
  file_size: number;
  recording_type: string;
  parent_id: string | null;
  memo?: string;
  audio_category_id?: string;
  audio_category?: string;
  is_training_data: boolean;
  created_at: number;
  updated_at: number;
};

// ゴミ箱内の録音一覧を取得（is_deleted = 1）
export async function getTrashRecordings() {
  try {
    const result = await db.execute({
      sql: `SELECT r.*, ac.name as audio_category_name FROM recordings r
            LEFT JOIN audio_categories ac ON r.audio_category_id = ac.id
            WHERE r.is_deleted = 1
            ORDER BY r.updated_at DESC`,
      args: [],
    });

    const rows = result.rows as Array<Record<string, unknown>>;
    return rows.map((row) => ({
      id: row.id as string,
      title: row.title as string,
      description: (row.description as string) ?? "",
      audio_url: row.audio_url as string,
      duration: row.duration as number,
      file_size: row.file_size as number,
      recording_type: row.recording_type as string,
      parent_id: row.parent_id as string | null,
      memo: row.memo as string | undefined,
      audio_category_id: row.audio_category_id as string | undefined,
      audio_category: row.audio_category_name as string | undefined,
      is_training_data: !!((row.is_training_data as number) === 1),
      created_at: row.created_at as number,
      updated_at: row.updated_at as number,
    }));
  } catch (error) {
    console.error("❌ ゴミ箱取得エラー:", error);
    return [];
  }
}

// ゴミ箱から復元
export async function restoreRecording(recordingId: string) {
  try {
    await db.execute({
      sql: "UPDATE recordings SET is_deleted = 0, updated_at = ? WHERE id = ?",
      args: [Date.now(), recordingId],
    });
    return { success: true };
  } catch (error) {
    console.error("❌ 復元エラー:", error);
    return { success: false, error: error instanceof Error ? error.message : "不明なエラー" };
  }
}

/**
 * 完全削除（R2 + Turso 連動、学習データ保護）
 * - ステップA: r2_key, is_training_data を取得
 * - ステップB: R2 から音声ファイルを物理削除
 * - ステップC: is_training_data = true の場合はレコードを残し r2_key を NULL に、false の場合は DELETE
 */
export async function deleteRecordingPermanently(recordingId: string) {
  try {
    const rowResult = await db.execute({
      sql: "SELECT id, r2_key, audio_url, is_training_data FROM recordings WHERE id = ? AND is_deleted = 1",
      args: [recordingId],
    });

    if (rowResult.rows.length === 0) {
      return { success: false, error: "ゴミ箱内に該当する録音が見つかりません" };
    }

    const row = rowResult.rows[0] as { r2_key?: string | null; audio_url?: string; is_training_data?: number };
    let r2Key = (row.r2_key as string | null | undefined)?.trim() || null;
    const audioUrl = (row.audio_url as string)?.trim();
    const isTrainingData = (row.is_training_data as number) === 1;

    if (!r2Key && audioUrl) {
      r2Key = extractR2KeyFromUrl(audioUrl);
    }

    // ステップB: R2 から物理削除（r2_key がある場合のみ）
    if (r2Key) {
      try {
        await deleteFromR2(r2Key);
      } catch (r2Error) {
        console.warn("R2削除スキップ（オブジェクトなし or 設定未済）:", r2Error);
        // R2 が未設定やオブジェクトが存在しない場合も DB 処理は続行
      }
    }

    // ステップC: Turso 側の条件付き処理
    if (isTrainingData) {
      // ケース2: 学習データとしてテキストを残す
      await db.execute({
        sql: `UPDATE recordings SET
              r2_key = NULL,
              audio_url = '',
              is_deleted = 0,
              is_archived_training_data = 1,
              updated_at = ?
              WHERE id = ?`,
        args: [Date.now(), recordingId],
      });
    } else {
      // ケース1: 完全に物理削除
      await db.execute({
        sql: "DELETE FROM recordings WHERE id = ?",
        args: [recordingId],
      });
    }

    return { success: true };
  } catch (error) {
    console.error("❌ 完全削除エラー:", error);
    return { success: false, error: error instanceof Error ? error.message : "不明なエラー" };
  }
}

// ゴミ箱を空にする（全件完全削除）
export async function emptyTrash() {
  try {
    const trashItems = await getTrashRecordings();
    for (const item of trashItems) {
      const result = await deleteRecordingPermanently(item.id);
      if (!result.success) {
        return { success: false, error: `削除失敗: ${item.title} - ${result.error}` };
      }
    }
    return { success: true };
  } catch (error) {
    console.error("❌ ゴミ箱空エラー:", error);
    return { success: false, error: error instanceof Error ? error.message : "不明なエラー" };
  }
}
