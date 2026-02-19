"use server";

import { db } from "@/src/lib/db";
// import { revalidatePath } from "next/cache";
import type { SituationTag, ItemSituation, EnrichedScriptItem } from "@/src/types/call";

// ========================================
// 状況タグの管理
// ========================================

// 状況タグを作成
export async function createSituationTag(
  name: string,
  category: string,
  description?: string,
  sortOrder: number = 0
) {
  try {
    const id = `tag_${Date.now()}`;
    const now = Date.now();

    await db.execute({
      sql: "INSERT INTO situation_tags (id, name, category, description, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      args: [id, name, category, description || "", sortOrder, now],
    });

    // revalidatePath("/call");
    return { success: true, tagId: id };
  } catch (error) {
    console.error("❌ 状況タグ作成エラー:", error);
    return { success: false, error: error instanceof Error ? error.message : "不明なエラー" };
  }
}

// すべての状況タグを取得
export async function getAllSituationTags(): Promise<SituationTag[]> {
  try {
    const result = await db.execute(
      "SELECT * FROM situation_tags ORDER BY category, sort_order ASC, created_at ASC"
    );

    return result.rows.map((row) => ({
      id: row.id as string,
      name: row.name as string,
      category: row.category as string,
      description: row.description as string,
      sort_order: row.sort_order as number,
      created_at: row.created_at as number,
    }));
  } catch (error) {
    console.error("❌ 状況タグ取得エラー:", error);
    return [];
  }
}

// カテゴリ別に状況タグを取得
export async function getSituationTagsByCategory() {
  try {
    const tags = await getAllSituationTags();
    const grouped: { [key: string]: SituationTag[] } = {};

    tags.forEach((tag) => {
      if (!grouped[tag.category]) {
        grouped[tag.category] = [];
      }
      grouped[tag.category].push(tag);
    });

    return { success: true, data: grouped };
  } catch (error) {
    console.error("❌ カテゴリ別タグ取得エラー:", error);
    return { success: false, data: {} };
  }
}

// ========================================
// トークアイテムと状況タグの紐付け
// ========================================

// トークアイテムに状況タグを紐付ける
export async function linkItemToSituation(
  itemId: string,
  situationTagId: string,
  priority: number = 0
) {
  try {
    const id = `link_${Date.now()}`;
    const now = Date.now();

    await db.execute({
      sql: "INSERT INTO item_situations (id, item_id, situation_tag_id, priority, created_at) VALUES (?, ?, ?, ?, ?)",
      args: [id, itemId, situationTagId, priority, now],
    });

    // revalidatePath("/call");
    return { success: true };
  } catch (error) {
    console.error("❌ 紐付けエラー:", error);
    return { success: false, error: error instanceof Error ? error.message : "不明なエラー" };
  }
}

// トークアイテムの紐付けを解除
export async function unlinkItemFromSituation(itemId: string, situationTagId: string) {
  try {
    await db.execute({
      sql: "DELETE FROM item_situations WHERE item_id = ? AND situation_tag_id = ?",
      args: [itemId, situationTagId],
    });

    // revalidatePath("/call");
    return { success: true };
  } catch (error) {
    console.error("❌ 紐付け解除エラー:", error);
    return { success: false, error: error instanceof Error ? error.message : "不明なエラー" };
  }
}

// ========================================
// ライブ・コーチング: 状況に応じたトーク提案
// ========================================

// 選択された状況タグに基づいて、最適なトークアイテムを取得
export async function getSuggestedTalks(selectedTagIds: string[]) {
  try {
    if (selectedTagIds.length === 0) {
      return { success: true, talks: [] };
    }

    // 選択されたタグに紐づくトークアイテムを取得（マッチ度スコアリング）
    const placeholders = selectedTagIds.map(() => "?").join(",");
    const result = await db.execute({
      sql: `
        SELECT 
          si.*,
          GROUP_CONCAT(st.id) as matched_tag_ids,
          GROUP_CONCAT(st.name) as matched_tag_names,
          COUNT(DISTINCT is2.situation_tag_id) as match_score,
          MAX(is2.priority) as max_priority
        FROM script_items si
        INNER JOIN item_situations is2 ON si.id = is2.item_id
        INNER JOIN situation_tags st ON is2.situation_tag_id = st.id
        WHERE is2.situation_tag_id IN (${placeholders})
        GROUP BY si.id
        ORDER BY match_score DESC, max_priority DESC, si.sort_order ASC
        LIMIT 10
      `,
      args: selectedTagIds,
    });

    const talks: EnrichedScriptItem[] = result.rows.map((row) => ({
      id: row.id as string,
      folder_id: row.folder_id as string,
      title: row.title as string,
      content: row.content as string,
      strategy_note: row.strategy_note as string,
      next_move_hint: row.next_move_hint as string,
      sort_order: row.sort_order as number,
      created_at: row.created_at as number,
      updated_at: row.updated_at as number,
      match_score: row.match_score as number,
    }));

    return { success: true, talks };
  } catch (error) {
    console.error("❌ 提案トーク取得エラー:", error);
    return { success: false, talks: [] };
  }
}

// 特定のトークアイテムに紐づく状況タグを取得
export async function getSituationTagsForItem(itemId: string): Promise<SituationTag[]> {
  try {
    const result = await db.execute({
      sql: `
        SELECT st.* 
        FROM situation_tags st
        INNER JOIN item_situations is2 ON st.id = is2.situation_tag_id
        WHERE is2.item_id = ?
        ORDER BY st.category, st.sort_order ASC
      `,
      args: [itemId],
    });

    return result.rows.map((row) => ({
      id: row.id as string,
      name: row.name as string,
      category: row.category as string,
      description: row.description as string,
      sort_order: row.sort_order as number,
      created_at: row.created_at as number,
    }));
  } catch (error) {
    console.error("❌ トーク用タグ取得エラー:", error);
    return [];
  }
}
