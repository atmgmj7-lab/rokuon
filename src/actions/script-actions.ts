"use server";

import { db } from "@/src/lib/db";
import { revalidatePath } from "next/cache";
import type { ScriptFlowData, Script, ParsedScript, ParsedScriptLog } from "@/src/types/script";

// スクリプトを作成
export async function createScript(title: string, flowData: ScriptFlowData) {
  try {
    const scriptId = `script_${Date.now()}`;
    const now = Date.now();

    await db.execute({
      sql: `INSERT INTO scripts (id, title, flow_data, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)`,
      args: [scriptId, title, JSON.stringify(flowData), now, now],
    });

    revalidatePath("/scripts");
    return { success: true, scriptId };
  } catch (error) {
    console.error("❌ スクリプト作成エラー:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "不明なエラー",
    };
  }
}

// スクリプトを更新
export async function updateScript(
  scriptId: string,
  title: string,
  flowData: ScriptFlowData
) {
  try {
    const now = Date.now();

    await db.execute({
      sql: `UPDATE scripts SET title = ?, flow_data = ?, updated_at = ? WHERE id = ?`,
      args: [title, JSON.stringify(flowData), now, scriptId],
    });

    revalidatePath("/scripts");
    revalidatePath(`/scripts/${scriptId}`);
    return { success: true };
  } catch (error) {
    console.error("❌ スクリプト更新エラー:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "不明なエラー",
    };
  }
}

// スクリプトを削除
export async function deleteScript(scriptId: string) {
  try {
    await db.execute({
      sql: `DELETE FROM scripts WHERE id = ?`,
      args: [scriptId],
    });

    revalidatePath("/scripts");
    return { success: true };
  } catch (error) {
    console.error("❌ スクリプト削除エラー:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "不明なエラー",
    };
  }
}

// すべてのスクリプトを取得
export async function getAllScripts(): Promise<ParsedScript[]> {
  try {
    const result = await db.execute("SELECT * FROM scripts ORDER BY created_at DESC");

    return result.rows.map((row) => ({
      id: row.id as string,
      title: row.title as string,
      flowData: JSON.parse(row.flow_data as string) as ScriptFlowData,
      created_at: row.created_at as number,
      updated_at: row.updated_at as number,
    }));
  } catch (error) {
    console.error("❌ スクリプト取得エラー:", error);
    return [];
  }
}

// 特定のスクリプトを取得
export async function getScriptById(scriptId: string): Promise<ParsedScript | null> {
  try {
    const result = await db.execute({
      sql: "SELECT * FROM scripts WHERE id = ?",
      args: [scriptId],
    });

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id as string,
      title: row.title as string,
      flowData: JSON.parse(row.flow_data as string) as ScriptFlowData,
      created_at: row.created_at as number,
      updated_at: row.updated_at as number,
    };
  } catch (error) {
    console.error("❌ スクリプト取得エラー:", error);
    return null;
  }
}

// スクリプト実行ログを保存
export async function saveScriptLog(
  scriptId: string,
  pathHistory: string[],
  resultStatus: string
) {
  try {
    const logId = `log_${Date.now()}`;
    const now = Date.now();

    await db.execute({
      sql: `INSERT INTO script_logs (id, script_id, path_history, result_status, created_at)
            VALUES (?, ?, ?, ?, ?)`,
      args: [logId, scriptId, JSON.stringify(pathHistory), resultStatus, now],
    });

    console.log("✅ スクリプトログ保存完了:", { logId, scriptId, resultStatus });
    
    revalidatePath(`/scripts/${scriptId}`);
    return { success: true, logId };
  } catch (error) {
    console.error("❌ スクリプトログ保存エラー:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "不明なエラー",
    };
  }
}

// 特定のスクリプトのログを取得
export async function getScriptLogs(scriptId: string): Promise<ParsedScriptLog[]> {
  try {
    const result = await db.execute({
      sql: "SELECT * FROM script_logs WHERE script_id = ? ORDER BY created_at DESC",
      args: [scriptId],
    });

    return result.rows.map((row) => ({
      id: row.id as string,
      script_id: row.script_id as string,
      pathHistory: JSON.parse(row.path_history as string) as string[],
      result_status: row.result_status as string,
      created_at: row.created_at as number,
    }));
  } catch (error) {
    console.error("❌ スクリプトログ取得エラー:", error);
    return [];
  }
}

// すべてのスクリプトログを取得
export async function getAllScriptLogs(): Promise<ParsedScriptLog[]> {
  try {
    const result = await db.execute(
      "SELECT * FROM script_logs ORDER BY created_at DESC LIMIT 100"
    );

    return result.rows.map((row) => ({
      id: row.id as string,
      script_id: row.script_id as string,
      pathHistory: JSON.parse(row.path_history as string) as string[],
      result_status: row.result_status as string,
      created_at: row.created_at as number,
    }));
  } catch (error) {
    console.error("❌ スクリプトログ取得エラー:", error);
    return [];
  }
}
