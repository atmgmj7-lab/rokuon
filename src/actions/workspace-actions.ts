"use server";

import { db } from "@/src/lib/db";
// import { revalidatePath } from "next/cache"; // Vercel mkdir/public エラー回避のため一時停止
import type { 
  ScriptCategory, 
  ScriptFolder, 
  ScriptItem, 
  ItemResponse, 
  Category, 
  Timeline, 
  TimelineBlock,
  Situation,
  CheckItem,
  TimelineCheckItem
} from "@/src/types/workspace";

// ========== カテゴリ（大分類）操作 ==========

export async function createCategory(name: string, description?: string) {
  try {
    const id = `cat_${Date.now()}`;
    const now = Date.now();

    await db.execute({
      sql: "INSERT INTO script_categories (id, name, description, created_at) VALUES (?, ?, ?, ?)",
      args: [id, name, description || "", now],
    });

    // revalidatePath("/workspace");
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

    // revalidatePath("/workspace");
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

    // revalidatePath("/workspace");
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

    // revalidatePath("/workspace");
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

    // revalidatePath("/workspace");
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

    // revalidatePath("/workspace");
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

    // revalidatePath("/workspace");
    return { success: true };
  } catch (error) {
    console.error("❌ フォルダ削除エラー:", error);
    return { success: false, error: error instanceof Error ? error.message : "不明なエラー" };
  }
}

// ========== トークアイテム操作 ==========

export async function deleteItem(itemId: string) {
  try {
    await db.execute({
      sql: "DELETE FROM script_items WHERE id = ?",
      args: [itemId],
    });

    // revalidatePath("/workspace");
    // revalidatePath("/call");
    return { success: true };
  } catch (error) {
    console.error("❌ アイテム削除エラー:", error);
    return { success: false, error: error instanceof Error ? error.message : "不明なエラー" };
  }
}

export async function createItem(
  folderId: string,
  title: string,
  content: string,
  hearingPurpose?: string,
  strategyNote?: string,
  nextMoveHint?: string,
  itemType: string = "component",
  targetSituationId?: string,
  triggerCheckItemId?: string,
  sortOrder: number = 0
) {
  try {
    const id = `item_${Date.now()}`;
    const now = Date.now();

    await db.execute({
      sql: `INSERT INTO script_items 
            (id, folder_id, title, hearing_purpose, content, strategy_note, next_move_hint, 
             item_type, target_situation_id, trigger_check_item_id, sort_order, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        folderId,
        title,
        hearingPurpose || "",
        content,
        strategyNote || "",
        nextMoveHint || "",
        itemType,
        targetSituationId || null,
        triggerCheckItemId || null,
        sortOrder,
        now,
        now,
      ],
    });

    // revalidatePath("/workspace");
    // revalidatePath("/call");
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
      hearing_purpose: row.hearing_purpose as string,
      content: row.content as string,
      strategy_note: row.strategy_note as string,
      next_move_hint: row.next_move_hint as string,
      category_id: row.category_id as string,
      is_quick_response: (row.is_quick_response as number) || 0,
      item_type: (row.item_type as string) || "main_scenario",
      target_situation_id: row.target_situation_id as string,
      trigger_check_item_id: row.trigger_check_item_id as string,
      sort_order: row.sort_order as number,
      created_at: row.created_at as number,
      updated_at: row.updated_at as number,
    }));
  } catch (error) {
    console.error("❌ アイテム取得エラー:", error);
    return [];
  }
}

// 特定のアイテムを取得
export async function getItemById(itemId: string): Promise<ScriptItem | null> {
  try {
    const result = await db.execute({
      sql: "SELECT * FROM script_items WHERE id = ?",
      args: [itemId],
    });

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id as string,
      folder_id: row.folder_id as string,
      title: row.title as string,
      hearing_purpose: row.hearing_purpose as string,
      content: row.content as string,
      strategy_note: row.strategy_note as string,
      next_move_hint: row.next_move_hint as string,
      category_id: row.category_id as string,
      is_quick_response: (row.is_quick_response as number) || 0,
      item_type: (row.item_type as string) || "main_scenario",
      target_situation_id: row.target_situation_id as string,
      trigger_check_item_id: row.trigger_check_item_id as string,
      sort_order: row.sort_order as number,
      created_at: row.created_at as number,
      updated_at: row.updated_at as number,
    };
  } catch (error) {
    console.error("❌ アイテム取得エラー:", error);
    return null;
  }
}

// すべてのアイテムを取得（カテゴリ問わず）
export async function getAllItems(): Promise<ScriptItem[]> {
  try {
    const result = await db.execute(
      "SELECT * FROM script_items ORDER BY folder_id, sort_order ASC, created_at ASC"
    );

    return result.rows.map((row) => ({
      id: row.id as string,
      folder_id: row.folder_id as string,
      title: row.title as string,
      hearing_purpose: row.hearing_purpose as string,
      content: row.content as string,
      strategy_note: row.strategy_note as string,
      next_move_hint: row.next_move_hint as string,
      category_id: row.category_id as string,
      is_quick_response: (row.is_quick_response as number) || 0,
      item_type: (row.item_type as string) || "main_scenario",
      target_situation_id: row.target_situation_id as string,
      trigger_check_item_id: row.trigger_check_item_id as string,
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
  hearingPurpose?: string,
  strategyNote?: string,
  nextMoveHint?: string,
  categoryId?: string,
  isQuickResponse?: number,
  itemType?: string,
  targetSituationId?: string,
  triggerCheckItemId?: string,
  sortOrder?: number
) {
  try {
    const now = Date.now();

    await db.execute({
      sql: `UPDATE script_items 
            SET title = ?, hearing_purpose = ?, content = ?, strategy_note = ?, next_move_hint = ?, 
                category_id = ?, is_quick_response = ?, item_type = ?, target_situation_id = ?, 
                trigger_check_item_id = ?, sort_order = COALESCE(?, sort_order), updated_at = ? 
            WHERE id = ?`,
      args: [
        title,
        hearingPurpose || "",
        content,
        strategyNote || "",
        nextMoveHint || "",
        categoryId || null,
        isQuickResponse !== undefined ? isQuickResponse : 0,
        itemType || "component",
        targetSituationId || null,
        triggerCheckItemId || null,
        sortOrder !== undefined ? sortOrder : null,
        now,
        itemId,
      ],
    });

    // 自動保存時の画面リロードを防ぐため、revalidatePathを削除
    // revalidatePath("/workspace");
    // revalidatePath("/call");
    return { success: true };
  } catch (error) {
    console.error("❌ アイテム更新エラー:", error);
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

// ========== 返答パターン（分岐）管理 ==========

// 返答パターンを作成
export async function createItemResponse(
  parentItemId: string,
  responseText: string,
  nextItemId?: string,
  sortOrder: number = 0
) {
  try {
    const id = `response_${Date.now()}`;
    const now = Date.now();

    await db.execute({
      sql: `INSERT INTO item_responses 
            (id, parent_item_id, response_text, next_item_id, sort_order, created_at) 
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [id, parentItemId, responseText, nextItemId || null, sortOrder, now],
    });

    // revalidatePath("/workspace");
    // revalidatePath("/call");
    return { success: true, responseId: id };
  } catch (error) {
    console.error("❌ 返答パターン作成エラー:", error);
    return { success: false, error: error instanceof Error ? error.message : "不明なエラー" };
  }
}

// 特定のトークアイテムの返答パターンを取得
export async function getResponsesByItem(parentItemId: string): Promise<ItemResponse[]> {
  try {
    const result = await db.execute({
      sql: "SELECT * FROM item_responses WHERE parent_item_id = ? ORDER BY sort_order ASC, created_at ASC",
      args: [parentItemId],
    });

    return result.rows.map((row) => ({
      id: row.id as string,
      parent_item_id: row.parent_item_id as string,
      response_text: row.response_text as string,
      next_item_id: row.next_item_id as string | undefined,
      sort_order: row.sort_order as number,
      created_at: row.created_at as number,
    }));
  } catch (error) {
    console.error("❌ 返答パターン取得エラー:", error);
    return [];
  }
}

// 返答パターンを更新
export async function updateItemResponse(
  responseId: string,
  responseText: string,
  nextItemId?: string
) {
  try {
    await db.execute({
      sql: "UPDATE item_responses SET response_text = ?, next_item_id = ? WHERE id = ?",
      args: [responseText, nextItemId || null, responseId],
    });

    // revalidatePath("/workspace");
    // revalidatePath("/call");
    return { success: true };
  } catch (error) {
    console.error("❌ 返答パターン更新エラー:", error);
    return { success: false, error: error instanceof Error ? error.message : "不明なエラー" };
  }
}

// 返答パターンを削除
export async function deleteItemResponse(responseId: string) {
  try {
    await db.execute({
      sql: "DELETE FROM item_responses WHERE id = ?",
      args: [responseId],
    });

    // revalidatePath("/workspace");
    // revalidatePath("/call");
    return { success: true };
  } catch (error) {
    console.error("❌ 返答パターン削除エラー:", error);
    return { success: false, error: error instanceof Error ? error.message : "不明なエラー" };
  }
}

// ========== カテゴリ管理 ==========

// すべてのカテゴリを取得
export async function getAllDynamicCategories(): Promise<Category[]> {
  try {
    const result = await db.execute(
      "SELECT * FROM categories ORDER BY sort_order ASC, created_at ASC"
    );

    return result.rows.map((row) => ({
      id: row.id as string,
      name: row.name as string,
      color: row.color as string,
      sort_order: row.sort_order as number,
      created_at: row.created_at as number,
    }));
  } catch (error) {
    console.error("❌ カテゴリ取得エラー:", error);
    return [];
  }
}

// カテゴリを作成
export async function createDynamicCategory(name: string, color: string = "#6B7280") {
  try {
    const id = `cat_${Date.now()}`;
    const now = Date.now();

    await db.execute({
      sql: "INSERT INTO categories (id, name, color, sort_order, created_at) VALUES (?, ?, ?, ?, ?)",
      args: [id, name, color, 0, now],
    });

    // revalidatePath("/workspace");
    return { success: true, categoryId: id };
  } catch (error) {
    console.error("❌ カテゴリ作成エラー:", error);
    return { success: false, error: error instanceof Error ? error.message : "不明なエラー" };
  }
}

// ========== タイムライン管理 ==========

// すべてのタイムラインを取得
export async function getAllTimelines(): Promise<Timeline[]> {
  try {
    const result = await db.execute(
      "SELECT * FROM timelines ORDER BY sort_order ASC, created_at ASC"
    );

    return result.rows.map((row) => ({
      id: row.id as string,
      title: row.title as string,
      description: row.description as string,
      sort_order: row.sort_order as number,
      created_at: row.created_at as number,
    }));
  } catch (error) {
    console.error("❌ タイムライン取得エラー:", error);
    return [];
  }
}

// タイムラインを作成
export async function createTimeline(title: string, description?: string) {
  try {
    const id = `tl_${Date.now()}`;
    const now = Date.now();

    await db.execute({
      sql: "INSERT INTO timelines (id, title, description, sort_order, created_at) VALUES (?, ?, ?, ?, ?)",
      args: [id, title, description || "", 0, now],
    });

    // revalidatePath("/workspace");
    // revalidatePath("/call");
    return { success: true, timelineId: id };
  } catch (error) {
    console.error("❌ タイムライン作成エラー:", error);
    return { success: false, error: error instanceof Error ? error.message : "不明なエラー" };
  }
}

// タイムラインにトークを紐付け
export async function addItemToTimeline(timelineId: string, scriptItemId: string, sortOrder: number = 0) {
  try {
    const id = `tb_${Date.now()}`;
    const now = Date.now();

    await db.execute({
      sql: "INSERT INTO timeline_blocks (id, timeline_id, script_item_id, sort_order, created_at) VALUES (?, ?, ?, ?, ?)",
      args: [id, timelineId, scriptItemId, sortOrder, now],
    });

    // revalidatePath("/workspace");
    // revalidatePath("/call");
    return { success: true };
  } catch (error) {
    console.error("❌ タイムラインブロック追加エラー:", error);
    return { success: false, error: error instanceof Error ? error.message : "不明なエラー" };
  }
}

// タイムラインのトークを取得
export async function getTimelineBlocks(timelineId: string): Promise<ScriptItem[]> {
  try {
    const result = await db.execute({
      sql: `
        SELECT si.* 
        FROM script_items si
        INNER JOIN timeline_blocks tb ON si.id = tb.script_item_id
        WHERE tb.timeline_id = ?
        ORDER BY tb.sort_order ASC, tb.created_at ASC
      `,
      args: [timelineId],
    });

    return result.rows.map((row) => ({
      id: row.id as string,
      folder_id: row.folder_id as string,
      title: row.title as string,
      hearing_purpose: row.hearing_purpose as string,
      content: row.content as string,
      strategy_note: row.strategy_note as string,
      next_move_hint: row.next_move_hint as string,
      category_id: row.category_id as string,
      is_quick_response: (row.is_quick_response as number) || 0,
      item_type: (row.item_type as string) || "main_scenario",
      target_situation_id: row.target_situation_id as string,
      trigger_check_item_id: row.trigger_check_item_id as string,
      sort_order: row.sort_order as number,
      created_at: row.created_at as number,
      updated_at: row.updated_at as number,
    }));
  } catch (error) {
    console.error("❌ タイムラインブロック取得エラー:", error);
    return [];
  }
}

// Quick Responseのアイテムを取得
export async function getQuickResponseItems(): Promise<ScriptItem[]> {
  try {
    const result = await db.execute(
      "SELECT * FROM script_items WHERE is_quick_response = 1 ORDER BY category_id, sort_order ASC"
    );

    return result.rows.map((row) => ({
      id: row.id as string,
      folder_id: row.folder_id as string,
      title: row.title as string,
      hearing_purpose: row.hearing_purpose as string,
      content: row.content as string,
      strategy_note: row.strategy_note as string,
      next_move_hint: row.next_move_hint as string,
      category_id: row.category_id as string,
      is_quick_response: (row.is_quick_response as number) || 0,
      item_type: (row.item_type as string) || "main_scenario",
      target_situation_id: row.target_situation_id as string,
      trigger_check_item_id: row.trigger_check_item_id as string,
      sort_order: row.sort_order as number,
      created_at: row.created_at as number,
      updated_at: row.updated_at as number,
    }));
  } catch (error) {
    console.error("❌ Quick Responseアイテム取得エラー:", error);
    return [];
  }
}

// ========== 状況タグ管理 ==========

// すべての状況タグを取得
export async function getAllSituations(): Promise<Situation[]> {
  try {
    const result = await db.execute(
      "SELECT * FROM situations ORDER BY sort_order ASC, created_at ASC"
    );

    return result.rows.map((row) => ({
      id: row.id as string,
      name: row.name as string,
      description: row.description as string,
      color: row.color as string,
      icon: row.icon as string,
      sort_order: row.sort_order as number,
      created_at: row.created_at as number,
    }));
  } catch (error) {
    console.error("❌ 状況タグ取得エラー:", error);
    return [];
  }
}

// 状況タグを作成
export async function createSituation(name: string, description?: string, icon: string = "📌", color: string = "#3B82F6") {
  try {
    const id = `sit_${Date.now()}`;
    const now = Date.now();

    await db.execute({
      sql: "INSERT INTO situations (id, name, description, icon, color, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      args: [id, name, description || "", icon, color, 0, now],
    });

    // revalidatePath("/workspace");
    // revalidatePath("/call");
    return { success: true, situationId: id };
  } catch (error) {
    console.error("❌ 状況タグ作成エラー:", error);
    return { success: false, error: error instanceof Error ? error.message : "不明なエラー" };
  }
}

// 状況タグを更新
export async function updateSituation(id: string, name: string, description?: string, icon?: string, color?: string) {
  try {
    await db.execute({
      sql: "UPDATE situations SET name = ?, description = ?, icon = ?, color = ? WHERE id = ?",
      args: [name, description || "", icon || "📌", color || "#3B82F6", id],
    });

    // revalidatePath("/workspace");
    // revalidatePath("/call");
    return { success: true };
  } catch (error) {
    console.error("❌ 状況タグ更新エラー:", error);
    return { success: false, error: error instanceof Error ? error.message : "不明なエラー" };
  }
}

// 状況タグを削除
export async function deleteSituation(id: string) {
  try {
    await db.execute({
      sql: "DELETE FROM situations WHERE id = ?",
      args: [id],
    });

    // revalidatePath("/workspace");
    // revalidatePath("/call");
    return { success: true };
  } catch (error) {
    console.error("❌ 状況タグ削除エラー:", error);
    return { success: false, error: error instanceof Error ? error.message : "不明なエラー" };
  }
}

// ========== チェック項目管理 ==========

// すべてのチェック項目を取得
export async function getAllCheckItems(): Promise<CheckItem[]> {
  try {
    const result = await db.execute(
      "SELECT * FROM check_items ORDER BY category, sort_order ASC, created_at ASC"
    );

    return result.rows.map((row) => ({
      id: row.id as string,
      name: row.name as string,
      description: row.description as string,
      category: row.category as string,
      sort_order: row.sort_order as number,
      created_at: row.created_at as number,
    }));
  } catch (error) {
    console.error("❌ チェック項目取得エラー:", error);
    return [];
  }
}

// チェック項目を作成
export async function createCheckItem(name: string, description?: string, category?: string) {
  try {
    const id = `chk_${Date.now()}`;
    const now = Date.now();

    await db.execute({
      sql: "INSERT INTO check_items (id, name, description, category, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      args: [id, name, description || "", category || "", 0, now],
    });

    // revalidatePath("/workspace");
    // revalidatePath("/call");
    return { success: true, checkItemId: id };
  } catch (error) {
    console.error("❌ チェック項目作成エラー:", error);
    return { success: false, error: error instanceof Error ? error.message : "不明なエラー" };
  }
}

// チェック項目を更新
export async function updateCheckItem(id: string, name: string, description?: string, category?: string) {
  try {
    await db.execute({
      sql: "UPDATE check_items SET name = ?, description = ?, category = ? WHERE id = ?",
      args: [name, description || "", category || "", id],
    });

    // revalidatePath("/workspace");
    // revalidatePath("/call");
    return { success: true };
  } catch (error) {
    console.error("❌ チェック項目更新エラー:", error);
    return { success: false, error: error instanceof Error ? error.message : "不明なエラー" };
  }
}

// チェック項目を削除
export async function deleteCheckItem(id: string) {
  try {
    await db.execute({
      sql: "DELETE FROM check_items WHERE id = ?",
      args: [id],
    });

    // revalidatePath("/workspace");
    // revalidatePath("/call");
    return { success: true };
  } catch (error) {
    console.error("❌ チェック項目削除エラー:", error);
    return { success: false, error: error instanceof Error ? error.message : "不明なエラー" };
  }
}

// ========== タイムラインとチェック項目の紐付け ==========

// タイムラインに紐づくチェック項目を取得
export async function getTimelineCheckItems(timelineId: string): Promise<CheckItem[]> {
  try {
    const result = await db.execute({
      sql: `
        SELECT ci.* 
        FROM check_items ci
        INNER JOIN timeline_check_items tci ON ci.id = tci.check_item_id
        WHERE tci.timeline_id = ?
        ORDER BY tci.sort_order ASC, tci.created_at ASC
      `,
      args: [timelineId],
    });

    return result.rows.map((row) => ({
      id: row.id as string,
      name: row.name as string,
      description: row.description as string,
      category: row.category as string,
      sort_order: row.sort_order as number,
      created_at: row.created_at as number,
    }));
  } catch (error) {
    console.error("❌ タイムラインチェック項目取得エラー:", error);
    return [];
  }
}

// タイムラインにチェック項目を紐付け
export async function addCheckItemToTimeline(timelineId: string, checkItemId: string, sortOrder: number = 0) {
  try {
    const id = `tci_${Date.now()}`;
    const now = Date.now();

    await db.execute({
      sql: "INSERT INTO timeline_check_items (id, timeline_id, check_item_id, sort_order, created_at) VALUES (?, ?, ?, ?, ?)",
      args: [id, timelineId, checkItemId, sortOrder, now],
    });

    // revalidatePath("/workspace");
    // revalidatePath("/call");
    return { success: true };
  } catch (error) {
    console.error("❌ チェック項目紐付けエラー:", error);
    return { success: false, error: error instanceof Error ? error.message : "不明なエラー" };
  }
}

// タイムラインからチェック項目の紐付けを削除
export async function removeCheckItemFromTimeline(timelineId: string, checkItemId: string) {
  try {
    await db.execute({
      sql: "DELETE FROM timeline_check_items WHERE timeline_id = ? AND check_item_id = ?",
      args: [timelineId, checkItemId],
    });

    // revalidatePath("/workspace");
    // revalidatePath("/call");
    return { success: true };
  } catch (error) {
    console.error("❌ チェック項目紐付け削除エラー:", error);
    return { success: false, error: error instanceof Error ? error.message : "不明なエラー" };
  }
}

// ========== タイムライン管理の拡張 ==========

// 状況タグに紐づくタイムラインを取得
export async function getTimelinesBySituation(situationId: string): Promise<Timeline[]> {
  try {
    const result = await db.execute({
      sql: "SELECT * FROM timelines WHERE situation_id = ? ORDER BY sort_order ASC, created_at ASC",
      args: [situationId],
    });

    return result.rows.map((row) => ({
      id: row.id as string,
      title: row.title as string,
      description: row.description as string,
      situation_id: row.situation_id as string,
      sort_order: row.sort_order as number,
      created_at: row.created_at as number,
    }));
  } catch (error) {
    console.error("❌ タイムライン取得エラー:", error);
    return [];
  }
}

// タイムライン作成を拡張（situation_idを含む）
export async function createTimelineWithSituation(title: string, situationId: string, description?: string) {
  try {
    const id = `tl_${Date.now()}`;
    const now = Date.now();

    await db.execute({
      sql: "INSERT INTO timelines (id, title, description, situation_id, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      args: [id, title, description || "", situationId, 0, now],
    });

    // revalidatePath("/workspace");
    // revalidatePath("/call");
    return { success: true, timelineId: id };
  } catch (error) {
    console.error("❌ タイムライン作成エラー:", error);
    return { success: false, error: error instanceof Error ? error.message : "不明なエラー" };
  }
}

// タイムライン削除
export async function deleteTimeline(id: string) {
  try {
    await db.execute({
      sql: "DELETE FROM timelines WHERE id = ?",
      args: [id],
    });

    // revalidatePath("/workspace");
    // revalidatePath("/call");
    return { success: true };
  } catch (error) {
    console.error("❌ タイムライン削除エラー:", error);
    return { success: false, error: error instanceof Error ? error.message : "不明なエラー" };
  }
}

// タイムラインからブロックを削除
export async function removeBlockFromTimeline(timelineId: string, scriptItemId: string) {
  try {
    await db.execute({
      sql: "DELETE FROM timeline_blocks WHERE timeline_id = ? AND script_item_id = ?",
      args: [timelineId, scriptItemId],
    });

    // revalidatePath("/workspace");
    // revalidatePath("/call");
    return { success: true };
  } catch (error) {
    console.error("❌ ブロック削除エラー:", error);
    return { success: false, error: error instanceof Error ? error.message : "不明なエラー" };
  }
}

// ========== 基本シナリオ・部品トーク取得 ==========

// 基本シナリオ（main_scenario）のトークを取得
export async function getMainScenarioItems(): Promise<ScriptItem[]> {
  try {
    const result = await db.execute(
      "SELECT * FROM script_items WHERE item_type = 'main_scenario' ORDER BY sort_order ASC, created_at ASC"
    );

    return result.rows.map((row) => ({
      id: row.id as string,
      folder_id: row.folder_id as string,
      title: row.title as string,
      hearing_purpose: row.hearing_purpose as string,
      content: row.content as string,
      strategy_note: row.strategy_note as string,
      next_move_hint: row.next_move_hint as string,
      category_id: row.category_id as string,
      is_quick_response: (row.is_quick_response as number) || 0,
      item_type: (row.item_type as string) || "main_scenario",
      target_situation_id: row.target_situation_id as string,
      trigger_check_item_id: row.trigger_check_item_id as string,
      sort_order: row.sort_order as number,
      created_at: row.created_at as number,
      updated_at: row.updated_at as number,
    }));
  } catch (error) {
    console.error("❌ 基本シナリオ取得エラー:", error);
    return [];
  }
}

// 部品トーク（component）を取得
export async function getComponentItems(): Promise<ScriptItem[]> {
  try {
    const result = await db.execute(
      "SELECT * FROM script_items WHERE item_type = 'component' ORDER BY sort_order ASC, created_at ASC"
    );

    return result.rows.map((row) => ({
      id: row.id as string,
      folder_id: row.folder_id as string,
      title: row.title as string,
      hearing_purpose: row.hearing_purpose as string,
      content: row.content as string,
      strategy_note: row.strategy_note as string,
      next_move_hint: row.next_move_hint as string,
      category_id: row.category_id as string,
      is_quick_response: (row.is_quick_response as number) || 0,
      item_type: (row.item_type as string) || "component",
      target_situation_id: row.target_situation_id as string,
      trigger_check_item_id: row.trigger_check_item_id as string,
      sort_order: row.sort_order as number,
      created_at: row.created_at as number,
      updated_at: row.updated_at as number,
    }));
  } catch (error) {
    console.error("❌ 部品トーク取得エラー:", error);
    return [];
  }
}

// 特定の状況タグに紐づく部品トークを取得
export async function getComponentsBySituation(situationId: string): Promise<ScriptItem[]> {
  try {
    const result = await db.execute({
      sql: "SELECT * FROM script_items WHERE item_type = 'component' AND target_situation_id = ? ORDER BY sort_order ASC, created_at ASC",
      args: [situationId],
    });

    return result.rows.map((row) => ({
      id: row.id as string,
      folder_id: row.folder_id as string,
      title: row.title as string,
      hearing_purpose: row.hearing_purpose as string,
      content: row.content as string,
      strategy_note: row.strategy_note as string,
      next_move_hint: row.next_move_hint as string,
      category_id: row.category_id as string,
      is_quick_response: (row.is_quick_response as number) || 0,
      item_type: (row.item_type as string) || "component",
      target_situation_id: row.target_situation_id as string,
      trigger_check_item_id: row.trigger_check_item_id as string,
      sort_order: row.sort_order as number,
      created_at: row.created_at as number,
      updated_at: row.updated_at as number,
    }));
  } catch (error) {
    console.error("❌ 状況別部品トーク取得エラー:", error);
    return [];
  }
}

// 特定のチェック項目に紐づく部品トークを取得
export async function getComponentsByCheckItem(checkItemId: string): Promise<ScriptItem[]> {
  try {
    const result = await db.execute({
      sql: "SELECT * FROM script_items WHERE item_type = 'component' AND trigger_check_item_id = ? ORDER BY sort_order ASC, created_at ASC",
      args: [checkItemId],
    });

    return result.rows.map((row) => ({
      id: row.id as string,
      folder_id: row.folder_id as string,
      title: row.title as string,
      hearing_purpose: row.hearing_purpose as string,
      content: row.content as string,
      strategy_note: row.strategy_note as string,
      next_move_hint: row.next_move_hint as string,
      category_id: row.category_id as string,
      is_quick_response: (row.is_quick_response as number) || 0,
      item_type: (row.item_type as string) || "component",
      target_situation_id: row.target_situation_id as string,
      trigger_check_item_id: row.trigger_check_item_id as string,
      sort_order: row.sort_order as number,
      created_at: row.created_at as number,
      updated_at: row.updated_at as number,
    }));
  } catch (error) {
    console.error("❌ チェック項目別部品トーク取得エラー:", error);
    return [];
  }
}
