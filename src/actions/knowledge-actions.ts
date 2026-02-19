"use server";

import { db } from "@/src/lib/db";
// import { revalidatePath } from "next/cache"; // Vercel mkdir/public エラー回避のため一時停止
import type { KnowledgeBase } from "@/src/types/script";

// Figmaデータを一括インポート
export async function importStaticKnowledge(
  knowledgeItems: Array<{
    category: "objection" | "question" | "hearing" | "key_talk";
    title: string;
    content: string;
    tags?: string;
    logic_explanation?: string;
    success_factors?: string;
    next_move_hint?: string;
  }>
) {
  try {
    const now = Date.now();
    let importedCount = 0;

    for (const item of knowledgeItems) {
      const id = `kb_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      await db.execute({
        sql: `INSERT INTO knowledge_base 
              (id, category, title, content, tags, logic_explanation, success_factors, next_move_hint, usage_count, success_count, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id,
          item.category,
          item.title,
          item.content,
          item.tags || "",
          item.logic_explanation || "",
          item.success_factors || "",
          item.next_move_hint || "",
          0,
          0,
          now,
          now,
        ],
      });

      importedCount++;
    }

    // revalidatePath("/knowledge");

    console.log(`✅ ${importedCount}件のナレッジをインポートしました`);

    return {
      success: true,
      importedCount,
    };
  } catch (error) {
    console.error("❌ ナレッジインポートエラー:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "不明なエラー",
    };
  }
}

// カテゴリ別にナレッジを取得
export async function getKnowledgeByCategory(
  category: "objection" | "question" | "hearing" | "key_talk"
): Promise<KnowledgeBase[]> {
  try {
    const result = await db.execute({
      sql: "SELECT * FROM knowledge_base WHERE category = ? ORDER BY usage_count DESC, created_at DESC",
      args: [category],
    });

    return result.rows.map((row) => ({
      id: row.id as string,
      category: row.category as "objection" | "question" | "hearing" | "key_talk",
      title: row.title as string,
      content: row.content as string,
      tags: row.tags as string,
      logic_explanation: row.logic_explanation as string,
      success_factors: row.success_factors as string,
      next_move_hint: row.next_move_hint as string,
      usage_count: row.usage_count as number,
      success_count: row.success_count as number,
      created_at: row.created_at as number,
      updated_at: row.updated_at as number,
    }));
  } catch (error) {
    console.error("❌ ナレッジ取得エラー:", error);
    return [];
  }
}

// すべてのナレッジを取得
export async function getAllKnowledge(): Promise<KnowledgeBase[]> {
  try {
    const result = await db.execute(
      "SELECT * FROM knowledge_base ORDER BY category, usage_count DESC"
    );

    return result.rows.map((row) => ({
      id: row.id as string,
      category: row.category as "objection" | "question" | "hearing" | "key_talk",
      title: row.title as string,
      content: row.content as string,
      tags: row.tags as string,
      logic_explanation: row.logic_explanation as string,
      success_factors: row.success_factors as string,
      next_move_hint: row.next_move_hint as string,
      usage_count: row.usage_count as number,
      success_count: row.success_count as number,
      created_at: row.created_at as number,
      updated_at: row.updated_at as number,
    }));
  } catch (error) {
    console.error("❌ ナレッジ取得エラー:", error);
    return [];
  }
}

// ナレッジの使用回数をインクリメント
export async function incrementKnowledgeUsage(knowledgeId: string, wasSuccessful: boolean = false) {
  try {
    if (wasSuccessful) {
      await db.execute({
        sql: "UPDATE knowledge_base SET usage_count = usage_count + 1, success_count = success_count + 1 WHERE id = ?",
        args: [knowledgeId],
      });
    } else {
      await db.execute({
        sql: "UPDATE knowledge_base SET usage_count = usage_count + 1 WHERE id = ?",
        args: [knowledgeId],
      });
    }

    return { success: true };
  } catch (error) {
    console.error("❌ 使用回数更新エラー:", error);
    return { success: false };
  }
}

// ナレッジを追加
export async function createKnowledge(
  category: "objection" | "question" | "hearing" | "key_talk",
  title: string,
  content: string,
  tags?: string,
  logic_explanation?: string,
  success_factors?: string,
  next_move_hint?: string
) {
  try {
    const id = `kb_${Date.now()}`;
    const now = Date.now();

    await db.execute({
      sql: `INSERT INTO knowledge_base 
            (id, category, title, content, tags, logic_explanation, success_factors, next_move_hint, usage_count, success_count, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        category,
        title,
        content,
        tags || "",
        logic_explanation || "",
        success_factors || "",
        next_move_hint || "",
        0,
        0,
        now,
        now,
      ],
    });

    // revalidatePath("/knowledge");

    return { success: true, knowledgeId: id };
  } catch (error) {
    console.error("❌ ナレッジ作成エラー:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "不明なエラー",
    };
  }
}
