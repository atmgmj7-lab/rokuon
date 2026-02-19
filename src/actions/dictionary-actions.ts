"use server";

import { db } from "@/src/lib/db";
// import { revalidatePath } from "next/cache";

export type DictionaryItem = {
  id: string;
  term: string;
  reading: string | null;
  category: string | null;
  created_at: number;
};

export async function getDictionaries(): Promise<DictionaryItem[]> {
  const result = await db.execute({
    sql: "SELECT id, term, reading, category, created_at FROM user_dictionaries ORDER BY created_at DESC",
    args: [],
  });

  return result.rows.map((row) => ({
    id: row.id as string,
    term: row.term as string,
    reading: row.reading as string | null,
    category: row.category as string | null,
    created_at: row.created_at as number,
  }));
}

export async function addDictionary(formData: FormData) {
  try {
    const term = formData.get("term") as string;
    const reading = (formData.get("reading") as string) || null;
    const category = (formData.get("category") as string) || null;

    if (!term?.trim()) {
      return { success: false, error: "専門用語は必須です" };
    }

    const id = crypto.randomUUID();
    const created_at = Date.now();

    await db.execute({
      sql: "INSERT INTO user_dictionaries (id, term, reading, category, created_at) VALUES (?, ?, ?, ?, ?)",
      args: [id, term.trim(), reading?.trim() || null, category || null, created_at],
    });

    // revalidatePath("/recordings/dictionary");
    return { success: true };
  } catch (error) {
    console.error("addDictionary error:", error);
    return { success: false, error: "用語の追加に失敗しました" };
  }
}

export async function deleteDictionary(id: string) {
  try {
    if (!id) {
      return { success: false, error: "IDが指定されていません" };
    }

    await db.execute({
      sql: "DELETE FROM user_dictionaries WHERE id = ?",
      args: [id],
    });

    // revalidatePath("/recordings/dictionary");
    return { success: true };
  } catch (error) {
    console.error("deleteDictionary error:", error);
    return { success: false, error: "用語の削除に失敗しました" };
  }
}
