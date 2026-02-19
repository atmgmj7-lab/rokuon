"use server";

import { db } from "@/src/lib/db";

export type RecordingCategory = {
  id: string;
  name: string;
  color: string;
  sort_order: number;
  created_at: number;
};

export async function getAllCategories(): Promise<RecordingCategory[]> {
  try {
    const result = await db.execute(
      "SELECT * FROM categories ORDER BY sort_order ASC, created_at ASC"
    );
    return result.rows.map((row) => ({
      id: row.id as string,
      name: row.name as string,
      color: (row.color as string) || "#6B7280",
      sort_order: (row.sort_order as number) ?? 0,
      created_at: row.created_at as number,
    }));
  } catch (error) {
    console.error("❌ カテゴリ取得エラー:", error);
    return [];
  }
}

export async function createCategory(name: string, color?: string) {
  try {
    const id = `cat_${Date.now()}`;
    const now = Date.now();
    await db.execute({
      sql: "INSERT INTO categories (id, name, color, sort_order, created_at) VALUES (?, ?, ?, ?, ?)",
      args: [id, name.trim(), color || "#6B7280", 0, now],
    });
    return { success: true, id };
  } catch (error) {
    console.error("❌ カテゴリ作成エラー:", error);
    return { success: false, error: error instanceof Error ? error.message : "不明なエラー" };
  }
}

export async function updateCategory(id: string, name: string, color?: string) {
  try {
    await db.execute({
      sql: "UPDATE categories SET name = ?, color = ? WHERE id = ?",
      args: [name.trim(), color || "#6B7280", id],
    });
    return { success: true };
  } catch (error) {
    console.error("❌ カテゴリ更新エラー:", error);
    return { success: false, error: error instanceof Error ? error.message : "不明なエラー" };
  }
}

export async function deleteCategory(id: string) {
  try {
    await db.execute({ sql: "DELETE FROM categories WHERE id = ?", args: [id] });
    await db.execute({
      sql: "DELETE FROM recording_categories WHERE category_id = ?",
      args: [id],
    });
    return { success: true };
  } catch (error) {
    console.error("❌ カテゴリ削除エラー:", error);
    return { success: false, error: error instanceof Error ? error.message : "不明なエラー" };
  }
}

export async function setRecordingCategory(recordingId: string, categoryId: string | null) {
  try {
    await db.execute({
      sql: "DELETE FROM recording_categories WHERE recording_id = ?",
      args: [recordingId],
    });
    if (categoryId) {
      const id = `rc_${Date.now()}`;
      const now = Date.now();
      await db.execute({
        sql: "INSERT INTO recording_categories (id, recording_id, category_id, created_at) VALUES (?, ?, ?, ?)",
        args: [id, recordingId, categoryId, now],
      });
    }
    await db.execute({
      sql: "UPDATE recordings SET category_id = ?, updated_at = ? WHERE id = ?",
      args: [categoryId, Date.now(), recordingId],
    });
    const cat = categoryId ? await getCategoryById(categoryId) : null;
    await db.execute({
      sql: "UPDATE recordings SET category = ? WHERE id = ?",
      args: [cat?.name ?? null, recordingId],
    });
    return { success: true };
  } catch (error) {
    console.error("❌ 録音カテゴリ設定エラー:", error);
    return { success: false, error: error instanceof Error ? error.message : "不明なエラー" };
  }
}

async function getCategoryById(id: string): Promise<RecordingCategory | null> {
  const result = await db.execute({
    sql: "SELECT * FROM categories WHERE id = ?",
    args: [id],
  });
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: row.id as string,
    name: row.name as string,
    color: (row.color as string) || "#6B7280",
    sort_order: (row.sort_order as number) ?? 0,
    created_at: row.created_at as number,
  };
}
