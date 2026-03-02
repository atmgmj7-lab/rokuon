/**
 * 拡張機能向け トークスクリプト API
 * Bearer トークン必須。Next.js から直接 Turso DB を参照
 *
 * - 全トークを対象（作成者による絞り込みなし）
 * - user_script_selections の is_visible=0 のみ除外
 * - component_talks: { "カテゴリ名": [{ title, content }, ...] } 形式で返却
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/src/lib/auth-request";
import { db } from "@/src/lib/db";

type Row = Record<string, unknown> & { [i: number]: unknown };

function getRowVal(row: Row, key: string, idx: number, trim = true): string {
  const v = row[key] ?? row[idx];
  const s = v != null ? String(v) : "";
  return trim ? s.trim() : s;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const hasAuth = !!authHeader?.startsWith("Bearer ");
  console.log("[ext/scripts] Authorization ヘッダー:", hasAuth ? "あり" : "なし", authHeader ? `(長さ=${authHeader.length})` : "");

  const session = await getSessionFromRequest(request);
  if (!session) {
    console.error("[ext/scripts] 認証失敗: トークンなし、または不正・期限切れ");
    return NextResponse.json(
      { success: false, error: "認証が必要です" },
      { status: 401 }
    );
  }

  const userId = session?.id;
  if (userId == null || userId === "") {
    console.error("[ext/scripts] ユーザーID抽出失敗: session.id=", session?.id);
    return NextResponse.json(
      { success: false, error: "ユーザー情報の取得に失敗しました" },
      { status: 401 }
    );
  }

  const userIdStr = String(userId);
  console.log("[ext/scripts] 抽出したユーザーID:", userIdStr);


  try {
    // 全トーク対象。user_script_selections で is_visible=0 のものだけ除外
    // script_items.category_id → categories でカテゴリ名取得
    const result = await db.execute({
      sql: `
        SELECT
          si.id,
          si.title,
          si.content,
          sf.folder_type,
          COALESCE(c.name, '') AS category_name
        FROM script_items si
        JOIN script_folders sf ON si.folder_id = sf.id
        LEFT JOIN categories c ON si.category_id = c.id
        WHERE NOT EXISTS (
          SELECT 1 FROM user_script_selections uss
          WHERE uss.script_item_id = si.id AND uss.user_id = ? AND uss.is_visible = 0
        )
        ORDER BY sf.folder_type, c.name, sf.sort_order ASC, si.sort_order ASC
      `,
      args: [userIdStr],
    });

    const rows = result.rows as Row[];
    console.log("[ext/scripts] 生レコード数=", rows.length, "columns=", result.columns);

    if (rows.length > 0) {
      console.log("[ext/scripts] 先頭行サンプル=", JSON.stringify(rows[0]));
    }

    // フラット配列を { "カテゴリ名": [{ id, title, content }, ...] } にグループ化（id は React key 用）
    const getId = (row: Row): string => {
      const v = row.id ?? row[0];
      return v != null ? String(v) : "";
    };
    const base_scenarios: { id: string; title: string; content: string }[] = [];
    const component_talks = rows.reduce<Record<string, { id: string; title: string; content: string }[]>>(
      (acc, row) => {
        const id = getId(row);
        const title = getRowVal(row, "title", 1);
        const content = getRowVal(row, "content", 2, false) || "";
        const folder_type = getRowVal(row, "folder_type", 3);
        const category_name = getRowVal(row, "category_name", 4);

        if (folder_type === "base_talk") {
          if (title) base_scenarios.push({ id: id || `base-${base_scenarios.length}`, title, content });
        } else if (folder_type === "situational") {
          const key = category_name || "未分類";
          if (title) {
            if (!acc[key]) acc[key] = [];
            acc[key].push({ id: id || `comp-${key}-${(acc[key]?.length ?? 0)}`, title, content });
          }
        }
        return acc;
      },
      {}
    );

    const responseData = {
      base_scenarios,
      component_talks,
    };

    const baseCount = base_scenarios.length;
    const compCount = Object.values(component_talks).reduce((s, arr) => s + arr.length, 0);
    const totalCount = baseCount + compCount;
    console.log("[ext/scripts] 最終データ件数: base_scenarios=", baseCount, ", component_talks=", compCount, ", 合計=", totalCount);

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("❌ ext/scripts エラー:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "スクリプト取得に失敗しました",
      },
      { status: 500 }
    );
  }
}
