"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/src/lib/db";
import { requireAdminOrError } from "@/src/actions/auth-actions";
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
  const authErr = await requireAdminOrError();
  if (authErr) return authErr;
  try {
    await db.execute({
      sql: "UPDATE recordings SET is_deleted = 0, updated_at = ? WHERE id = ?",
      args: [Date.now(), recordingId],
    });
    revalidatePath("/recordings");
    revalidatePath("/trash");
    return { success: true };
  } catch (error) {
    console.error("❌ 復元エラー:", error);
    return { success: false, error: error instanceof Error ? error.message : "不明なエラー" };
  }
}

/** トランスクリプトJSONから type: "feedback" の audioUrl を抽出し、R2キー一覧を返す */
function extractR2KeysFromTranscriptContent(content: string): string[] {
  const keys: string[] = [];
  let items: unknown[];
  try {
    const parsed = JSON.parse(content);
    items = Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return keys;
  }
  for (const x of items) {
    if (typeof x !== "object" || x === null) continue;
    const obj = x as { type?: string; audioUrl?: string };
    if (obj.type === "feedback" && typeof obj.audioUrl === "string" && obj.audioUrl.trim()) {
      const k = extractR2KeyFromUrl(obj.audioUrl);
      if (k) keys.push(k);
    }
  }
  return keys;
}

/** トランスクリプトJSONから audioUrl を除去（学習データ保護でテキストのみ残す） */
function stripAudioUrlFromTranscriptContent(content: string): string {
  let items: unknown[];
  try {
    const parsed = JSON.parse(content);
    items = Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return content;
  }
  const stripped = items.map((x) => {
    if (typeof x !== "object" || x === null) return x;
    const obj = x as { type?: string; audioUrl?: string; text?: string };
    if (obj.type === "feedback") {
      const { audioUrl: _a, ...rest } = obj;
      return rest;
    }
    return x;
  });
  return JSON.stringify(stripped);
}

/**
 * 完全削除（R2 + Turso 連動、学習データ保護、インライン音声一括削除）
 * - 親削除時: 親・子・トランスクリプト内インライン音声をすべてR2から削除
 * - 学習データ時: 音声は削除するが、テキスト（JSON・summary）は残す
 */
export async function deleteRecordingPermanently(recordingId: string) {
  const authErr = await requireAdminOrError();
  if (authErr) return authErr;
  try {
    const rowResult = await db.execute({
      sql: "SELECT id, r2_key, audio_url, is_training_data, parent_id FROM recordings WHERE id = ? AND is_deleted = 1",
      args: [recordingId],
    });

    if (rowResult.rows.length === 0) {
      return { success: false, error: "ゴミ箱内に該当する録音が見つかりません" };
    }

    const row = rowResult.rows[0] as {
      r2_key?: string | null;
      audio_url?: string;
      is_training_data?: number;
      parent_id?: string | null;
    };
    const isTrainingData = (row.is_training_data as number) === 1;
    const parentId = (row.parent_id as string | null)?.trim() || null;
    const isParent = !parentId;

    const r2KeysToDelete = new Set<string>();

    const addKey = (r2Key: string | null) => {
      if (r2Key?.trim()) r2KeysToDelete.add(r2Key.trim());
    };

    let r2Key = (row.r2_key as string | null | undefined)?.trim() || null;
    const audioUrl = (row.audio_url as string)?.trim();
    if (!r2Key && audioUrl) r2Key = extractR2KeyFromUrl(audioUrl);
    addKey(r2Key);

    if (isParent) {
      const childrenResult = await db.execute({
        sql: "SELECT id, r2_key, audio_url FROM recordings WHERE parent_id = ?",
        args: [recordingId],
      });
      for (const c of childrenResult.rows as Array<{ r2_key?: string | null; audio_url?: string }>) {
        let ck = (c.r2_key as string | null | undefined)?.trim() || null;
        const cu = (c.audio_url as string)?.trim();
        if (!ck && cu) ck = extractR2KeyFromUrl(cu);
        addKey(ck);
      }

      const transResult = await db.execute({
        sql: "SELECT id, content FROM transcripts WHERE recording_id = ? ORDER BY created_at DESC LIMIT 1",
        args: [recordingId],
      });
      if (transResult.rows.length > 0) {
        const content = transResult.rows[0].content as string;
        for (const k of extractR2KeysFromTranscriptContent(content)) {
          addKey(k);
        }
      }
    }

    for (const k of r2KeysToDelete) {
      try {
        await deleteFromR2(k);
      } catch (r2Error) {
        console.warn("R2削除スキップ:", k, r2Error);
      }
    }

    const now = Date.now();

    if (isTrainingData) {
      if (isParent) {
        await db.execute({
          sql: `UPDATE recordings SET r2_key = NULL, audio_url = '', is_deleted = 0, is_archived_training_data = 1, updated_at = ? WHERE id = ?`,
          args: [now, recordingId],
        });
        await db.execute({
          sql: `UPDATE recordings SET r2_key = NULL, audio_url = '', is_deleted = 0, is_archived_training_data = 1, updated_at = ? WHERE parent_id = ?`,
          args: [now, recordingId],
        });
        const transResult = await db.execute({
          sql: "SELECT id, content FROM transcripts WHERE recording_id = ? ORDER BY created_at DESC LIMIT 1",
          args: [recordingId],
        });
        if (transResult.rows.length > 0) {
          const row = transResult.rows[0] as { id: string; content: string };
          const stripped = stripAudioUrlFromTranscriptContent(row.content);
          await db.execute({
            sql: "UPDATE transcripts SET content = ? WHERE id = ?",
            args: [stripped, row.id],
          });
        }
      } else {
        await db.execute({
          sql: `UPDATE recordings SET r2_key = NULL, audio_url = '', is_deleted = 0, is_archived_training_data = 1, updated_at = ? WHERE id = ?`,
          args: [now, recordingId],
        });
      }
    } else {
      if (isParent) {
        await db.execute({ sql: "DELETE FROM recordings WHERE id = ?", args: [recordingId] });
      } else {
        await db.execute({ sql: "DELETE FROM recordings WHERE id = ?", args: [recordingId] });
      }
    }

    revalidatePath("/recordings");
    revalidatePath("/trash");
    return { success: true };
  } catch (error) {
    console.error("❌ 完全削除エラー:", error);
    return { success: false, error: error instanceof Error ? error.message : "不明なエラー" };
  }
}

// ゴミ箱を空にする（全件完全削除）
export async function emptyTrash() {
  const authErr = await requireAdminOrError();
  if (authErr) return authErr;
  try {
    const trashItems = await getTrashRecordings();
    for (const item of trashItems) {
      const result = await deleteRecordingPermanently(item.id);
      if (!result.success) {
        return { success: false, error: `削除失敗: ${item.title} - ${result.error}` };
      }
    }
    revalidatePath("/recordings");
    revalidatePath("/trash");
    return { success: true };
  } catch (error) {
    console.error("❌ ゴミ箱空エラー:", error);
    return { success: false, error: error instanceof Error ? error.message : "不明なエラー" };
  }
}
