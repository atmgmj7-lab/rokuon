"use server";

import { db } from "@/src/lib/db";

export type AudioCategory = {
  id: string;
  name: string;
  color: string;
  sort_order: number;
  created_at: number;
};

export async function getAllAudioCategories(): Promise<AudioCategory[]> {
  try {
    const result = await db.execute(
      "SELECT * FROM audio_categories ORDER BY sort_order ASC, created_at ASC"
    );
    return result.rows.map((row) => ({
      id: row.id as string,
      name: row.name as string,
      color: (row.color as string) || "#6B7280",
      sort_order: (row.sort_order as number) ?? 0,
      created_at: row.created_at as number,
    }));
  } catch (error) {
    console.error("❌ 音声カテゴリ取得エラー:", error);
    return [];
  }
}

export async function createAudioCategory(name: string, color?: string) {
  try {
    const id = `acat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = Date.now();
    await db.execute({
      sql: "INSERT INTO audio_categories (id, name, color, sort_order, created_at) VALUES (?, ?, ?, ?, ?)",
      args: [id, name.trim(), color || "#6B7280", 0, now],
    });
    return { success: true, id };
  } catch (error) {
    console.error("❌ 音声カテゴリ作成エラー:", error);
    return { success: false, error: error instanceof Error ? error.message : "不明なエラー" };
  }
}

export async function updateAudioCategory(id: string, name: string, color?: string) {
  try {
    await db.execute({
      sql: "UPDATE audio_categories SET name = ?, color = ? WHERE id = ?",
      args: [name.trim(), color || "#6B7280", id],
    });
    return { success: true };
  } catch (error) {
    console.error("❌ 音声カテゴリ更新エラー:", error);
    return { success: false, error: error instanceof Error ? error.message : "不明なエラー" };
  }
}

export async function deleteAudioCategory(id: string) {
  try {
    await db.execute({
      sql: "UPDATE recordings SET audio_category_id = NULL WHERE audio_category_id = ?",
      args: [id],
    });
    await db.execute({ sql: "DELETE FROM audio_categories WHERE id = ?", args: [id] });
    return { success: true };
  } catch (error) {
    console.error("❌ 音声カテゴリ削除エラー:", error);
    return { success: false, error: error instanceof Error ? error.message : "不明なエラー" };
  }
}
