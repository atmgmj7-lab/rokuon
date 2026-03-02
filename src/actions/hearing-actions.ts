"use server";

import { db } from "@/src/lib/db";
import { requireAdminOrError } from "@/src/actions/auth-actions";

export type HearingCategory = {
  id: string;
  name: string;
  sort_order: number;
  created_at: number;
};

export type HearingItem = {
  id: string;
  category_id: string;
  title: string;
  content: string;
  sort_order: number;
  created_at: number;
};

export async function getAllHearingCategories(): Promise<HearingCategory[]> {
  try {
    const result = await db.execute(
      "SELECT * FROM hearing_categories ORDER BY sort_order ASC, created_at ASC"
    );
    return result.rows.map((row) => ({
      id: row.id as string,
      name: row.name as string,
      sort_order: (row.sort_order as number) ?? 0,
      created_at: row.created_at as number,
    }));
  } catch (error) {
    console.error("❌ ヒアリングカテゴリ取得エラー:", error);
    return [];
  }
}

export async function createHearingCategory(name: string) {
  const authErr = await requireAdminOrError();
  if (authErr) return authErr;
  try {
    const id = `hc_${Date.now()}`;
    const now = Date.now();
    await db.execute({
      sql: "INSERT INTO hearing_categories (id, name, sort_order, created_at) VALUES (?, ?, ?, ?)",
      args: [id, name.trim(), 0, now],
    });
    return { success: true, id };
  } catch (error) {
    console.error("❌ ヒアリングカテゴリ作成エラー:", error);
    return { success: false, error: error instanceof Error ? error.message : "不明なエラー" };
  }
}

export async function deleteHearingCategory(categoryId: string) {
  const authErr = await requireAdminOrError();
  if (authErr) return authErr;
  try {
    await db.execute({
      sql: "DELETE FROM hearing_categories WHERE id = ?",
      args: [categoryId],
    });
    return { success: true };
  } catch (error) {
    console.error("❌ ヒアリングカテゴリ削除エラー:", error);
    return { success: false, error: error instanceof Error ? error.message : "不明なエラー" };
  }
}

export async function getHearingItemsByCategory(categoryId: string): Promise<HearingItem[]> {
  try {
    const result = await db.execute({
      sql: "SELECT * FROM hearing_items WHERE category_id = ? ORDER BY sort_order ASC, created_at ASC",
      args: [categoryId],
    });
    return result.rows.map((row) => ({
      id: row.id as string,
      category_id: row.category_id as string,
      title: (row.title as string) ?? "",
      content: (row.content as string) ?? "",
      sort_order: (row.sort_order as number) ?? 0,
      created_at: row.created_at as number,
    }));
  } catch (error) {
    console.error("❌ ヒアリング項目取得エラー:", error);
    return [];
  }
}

export async function getAllHearingItems(): Promise<HearingItem[]> {
  try {
    const result = await db.execute(
      "SELECT * FROM hearing_items ORDER BY category_id, sort_order ASC, created_at ASC"
    );
    return result.rows.map((row) => ({
      id: row.id as string,
      category_id: row.category_id as string,
      title: (row.title as string) ?? "",
      content: (row.content as string) ?? "",
      sort_order: (row.sort_order as number) ?? 0,
      created_at: row.created_at as number,
    }));
  } catch (error) {
    console.error("❌ ヒアリング項目取得エラー:", error);
    return [];
  }
}

export async function createHearingItem(categoryId: string, title: string, content: string) {
  const authErr = await requireAdminOrError();
  if (authErr) return authErr;
  try {
    const id = `hi_${Date.now()}`;
    const now = Date.now();
    await db.execute({
      sql: "INSERT INTO hearing_items (id, category_id, title, content, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      args: [id, categoryId, title.trim(), content.trim(), 0, now],
    });
    return { success: true, id };
  } catch (error) {
    console.error("❌ ヒアリング項目作成エラー:", error);
    return { success: false, error: error instanceof Error ? error.message : "不明なエラー" };
  }
}

export async function updateHearingItem(itemId: string, title: string, content: string) {
  const authErr = await requireAdminOrError();
  if (authErr) return authErr;
  try {
    await db.execute({
      sql: "UPDATE hearing_items SET title = ?, content = ? WHERE id = ?",
      args: [title.trim(), content.trim(), itemId],
    });
    return { success: true };
  } catch (error) {
    console.error("❌ ヒアリング項目更新エラー:", error);
    return { success: false, error: error instanceof Error ? error.message : "不明なエラー" };
  }
}

export async function deleteHearingItem(itemId: string) {
  const authErr = await requireAdminOrError();
  if (authErr) return authErr;
  try {
    await db.execute({
      sql: "DELETE FROM hearing_items WHERE id = ?",
      args: [itemId],
    });
    return { success: true };
  } catch (error) {
    console.error("❌ ヒアリング項目削除エラー:", error);
    return { success: false, error: error instanceof Error ? error.message : "不明なエラー" };
  }
}
