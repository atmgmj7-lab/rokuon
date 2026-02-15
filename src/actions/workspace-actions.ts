"use server";

import { db } from "@/src/lib/db";
import { revalidatePath } from "next/cache";
import type { ScriptCategory, ScriptFolder, ScriptItem } from "@/src/types/workspace";

// ========== カテゴリ（大分類）操作 ==========

export async function createCategory(name: string, description?: string) {
  try {
    const id = `cat_${Date.now()}`;
    const now = Date.now();

    await db.execute({
      sql: "INSERT INTO script_categories (id, name, description, created_at) VALUES (?, ?, ?, ?)",
      args: [id, name, description || "", now],
    });

    revalidatePath("/workspace");
    return { success: true, categoryId: id };
  } catch (error) {
    console.error("❌ カテゴリ作成エラー:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "不明なエラー",
    };
  }
}

export async function getAllCategories(): Promise<ScriptCategory[]> {
  try {
    const result = await db.execute("SELECT * FROM script_categories ORDER BY created_at ASC");

    return result.rows.map((row) => ({
      id: row.id as string,
      name: row.name as string,
      description: row.description as string,
      created_at: row.created_at as number,
    }));
  } catch (error) {
    console.error("❌ カテゴリ取得エラー:", error);
    return [];
  }
}

export async function updateCategory(categoryId: string, name: string, description?: string) {
  try {
    await db.execute({
      sql: "UPDATE script_categories SET name = ?, description = ? WHERE id = ?",
      args: [name, description || "", categoryId],
    });

    revalidatePath("/workspace");
    return { success: true };
  } catch (error) {
    console.error("❌ カテゴリ更新エラー:", error);
    return { success: false, error: error instanceof Error ? error.message : "不明なエラー" };
  }
}

export async function deleteCategory(categoryId: string) {
  try {
    await db.execute({
      sql: "DELETE FROM script_categories WHERE id = ?",
      args: [categoryId],
    });

    revalidatePath("/workspace");
    return { success: true };
  } catch (error) {
    console.error("❌ カテゴリ削除エラー:", error);
    return { success: false, error: error instanceof Error ? error.message : "不明なエラー" };
  }
}

// ========== フォルダ（中分類）操作 ==========

export async function createFolder(
  categoryId: string,
  name: string,
  folderType: "base_talk" | "situational",
  sortOrder: number = 0,
  isVisibleInSidebar: number = 1
) {
  try {
    const id = `folder_${Date.now()}`;
    const now = Date.now();

    await db.execute({
      sql: "INSERT INTO script_folders (id, category_id, name, folder_type, sort_order, is_visible_in_sidebar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      args: [id, categoryId, name, folderType, sortOrder, isVisibleInSidebar, now],
    });

    revalidatePath("/workspace");
    return { success: true, folderId: id };
  } catch (error) {
    console.error("❌ フォルダ作成エラー:", error);
    return { success: false, error: error instanceof Error ? error.message : "不明なエラー" };
  }
}

export async function getFoldersByCategory(categoryId: string): Promise<ScriptFolder[]> {
  try {
    const result = await db.execute({
      sql: "SELECT * FROM script_folders WHERE category_id = ? ORDER BY sort_order ASC, created_at ASC",
      args: [categoryId],
    });

    return result.rows.map((row) => ({
      id: row.id as string,
      category_id: row.category_id as string,
      name: row.name as string,
      folder_type: row.folder_type as "base_talk" | "situational",
      sort_order: row.sort_order as number,
      is_visible_in_sidebar: row.is_visible_in_sidebar as number,
      created_at: row.created_at as number,
    }));
  } catch (error) {
    console.error("❌ フォルダ取得エラー:", error);
    return [];
  }
}

export async function updateFolder(
  folderId: string,
  name: string,
  folderType: "base_talk" | "situational",
  sortOrder: number,
  isVisibleInSidebar?: number
) {
  try {
    if (isVisibleInSidebar !== undefined) {
      await db.execute({
        sql: "UPDATE script_folders SET name = ?, folder_type = ?, sort_order = ?, is_visible_in_sidebar = ? WHERE id = ?",
        args: [name, folderType, sortOrder, isVisibleInSidebar, folderId],
      });
    } else {
      await db.execute({
        sql: "UPDATE script_folders SET name = ?, folder_type = ?, sort_order = ? WHERE id = ?",
        args: [name, folderType, sortOrder, folderId],
      });
    }

    revalidatePath("/workspace");
    return { success: true };
  } catch (error) {
    console.error("❌ フォルダ更新エラー:", error);
    return { success: false, error: error instanceof Error ? error.message : "不明なエラー" };
  }
}

// サイドバー表示を切り替え
export async function toggleSidebarVisibility(folderId: string, isVisible: boolean) {
  try {
    await db.execute({
      sql: "UPDATE script_folders SET is_visible_in_sidebar = ? WHERE id = ?",
      args: [isVisible ? 1 : 0, folderId],
    });

    revalidatePath("/workspace");
    return { success: true };
  } catch (error) {
    console.error("❌ 表示切り替えエラー:", error);
    return { success: false, error: error instanceof Error ? error.message : "不明なエラー" };
  }
}

// すべてのフォルダを取得（カテゴリ問わず）
export async function getAllFolders(): Promise<ScriptFolder[]> {
  try {
    const result = await db.execute(
      "SELECT * FROM script_folders ORDER BY category_id, sort_order ASC"
    );

    return result.rows.map((row) => ({
      id: row.id as string,
      category_id: row.category_id as string,
      name: row.name as string,
      folder_type: row.folder_type as "base_talk" | "situational",
      sort_order: row.sort_order as number,
      is_visible_in_sidebar: row.is_visible_in_sidebar as number,
      created_at: row.created_at as number,
    }));
  } catch (error) {
    console.error("❌ フォルダ取得エラー:", error);
    return [];
  }
}

export async function deleteFolder(folderId: string) {
  try {
    await db.execute({
      sql: "DELETE FROM script_folders WHERE id = ?",
      args: [folderId],
    });

    revalidatePath("/workspace");
    return { success: true };
  } catch (error) {
    console.error("❌ フォルダ削除エラー:", error);
    return { success: false, error: error instanceof Error ? error.message : "不明なエラー" };
  }
}

// ========== トークアイテム操作 ==========

export async function createItem(
  folderId: string,
  title: string,
  content: string,
  strategyNote?: string,
  nextMoveHint?: string,
  sortOrder: number = 0
) {
  try {
    const id = `item_${Date.now()}`;
    const now = Date.now();

    await db.execute({
      sql: `INSERT INTO script_items 
            (id, folder_id, title, content, strategy_note, next_move_hint, sort_order, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, folderId, title, content, strategyNote || "", nextMoveHint || "", sortOrder, now, now],
    });

    revalidatePath("/workspace");
    return { success: true, itemId: id };
  } catch (error) {
    console.error("❌ アイテム作成エラー:", error);
    return { success: false, error: error instanceof Error ? error.message : "不明なエラー" };
  }
}

export async function getItemsByFolder(folderId: string): Promise<ScriptItem[]> {
  try {
    const result = await db.execute({
      sql: "SELECT * FROM script_items WHERE folder_id = ? ORDER BY sort_order ASC, created_at ASC",
      args: [folderId],
    });

    return result.rows.map((row) => ({
      id: row.id as string,
      folder_id: row.folder_id as string,
      title: row.title as string,
      content: row.content as string,
      strategy_note: row.strategy_note as string,
      next_move_hint: row.next_move_hint as string,
      sort_order: row.sort_order as number,
      created_at: row.created_at as number,
      updated_at: row.updated_at as number,
    }));
  } catch (error) {
    console.error("❌ アイテム取得エラー:", error);
    return [];
  }
}

export async function updateItem(
  itemId: string,
  title: string,
  content: string,
  strategyNote?: string,
  nextMoveHint?: string,
  sortOrder?: number
) {
  try {
    const now = Date.now();

    if (sortOrder !== undefined) {
      await db.execute({
        sql: `UPDATE script_items 
              SET title = ?, content = ?, strategy_note = ?, next_move_hint = ?, sort_order = ?, updated_at = ? 
              WHERE id = ?`,
        args: [title, content, strategyNote || "", nextMoveHint || "", sortOrder, now, itemId],
      });
    } else {
      await db.execute({
        sql: `UPDATE script_items 
              SET title = ?, content = ?, strategy_note = ?, next_move_hint = ?, updated_at = ? 
              WHERE id = ?`,
        args: [title, content, strategyNote || "", nextMoveHint || "", now, itemId],
      });
    }

    revalidatePath("/workspace");
    return { success: true };
  } catch (error) {
    console.error("❌ アイテム更新エラー:", error);
    return { success: false, error: error instanceof Error ? error.message : "不明なエラー" };
  }
}

export async function deleteItem(itemId: string) {
  try {
    await db.execute({
      sql: "DELETE FROM script_items WHERE id = ?",
      args: [itemId],
    });

    revalidatePath("/workspace");
    return { success: true };
  } catch (error) {
    console.error("❌ アイテム削除エラー:", error);
    return { success: false, error: error instanceof Error ? error.message : "不明なエラー" };
  }
}

// ========== 階層構造全体の取得 ==========

export async function getWorkspaceHierarchy() {
  try {
    const categories = await getAllCategories();
    
    const hierarchy = await Promise.all(
      categories.map(async (category) => {
        const folders = await getFoldersByCategory(category.id);
        
        const foldersWithItems = await Promise.all(
          folders.map(async (folder) => {
            const items = await getItemsByFolder(folder.id);
            return { folder, items };
          })
        );

        return { category, folders: foldersWithItems };
      })
    );

    return { success: true, hierarchy };
  } catch (error) {
    console.error("❌ 階層構造取得エラー:", error);
    return { success: false, error: error instanceof Error ? error.message : "不明なエラー" };
  }
}
