/**
 * 拡張機能向け アポヒアリング API
 * Bearer トークン必須。Next.js から直接 Turso DB を参照
 *
 * - hearing_categories / hearing_items を取得
 * - ワークスペース共通データ（ユーザー別フィルタなし）
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/src/lib/auth-request";
import { db } from "@/src/lib/db";

type Row = Record<string, unknown> & { [i: number]: unknown };

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const hasAuth = !!authHeader?.startsWith("Bearer ");
  console.log("[ext/hearing] Authorization ヘッダー:", hasAuth ? "あり" : "なし");

  const session = await getSessionFromRequest(request);
  if (!session) {
    console.error("[ext/hearing] 認証失敗: トークンなし、または不正・期限切れ");
    return NextResponse.json(
      { success: false, error: "認証が必要です" },
      { status: 401 }
    );
  }

  try {
    const catResult = await db.execute({
      sql: "SELECT id, name, sort_order FROM hearing_categories ORDER BY sort_order ASC, created_at ASC",
      args: [],
    });
    const itemResult = await db.execute({
      sql: "SELECT id, category_id, title, content FROM hearing_items ORDER BY category_id, sort_order ASC, created_at ASC",
      args: [],
    });

    const catRows = catResult.rows as Row[];
    const itemRows = itemResult.rows as Row[];

    const categories = catRows.map((row) => ({
      id: String(row.id ?? row[0] ?? ""),
      name: String(row.name ?? row[1] ?? ""),
      sort_order: Number(row.sort_order ?? row[2] ?? 0),
    }));

    const items_by_category: Record<string, { id: string; title: string; content: string }[]> = {};
    for (const row of itemRows) {
      const id = String(row.id ?? row[0] ?? "");
      const category_id = String(row.category_id ?? row[1] ?? "");
      const title = String(row.title ?? row[2] ?? "");
      const content = String(row.content ?? row[3] ?? "");
      if (!category_id) continue;
      if (!items_by_category[category_id]) items_by_category[category_id] = [];
      items_by_category[category_id].push({ id, title, content });
    }

    const totalItems = Object.values(items_by_category).reduce((s, arr) => s + arr.length, 0);
    console.log("[ext/hearing] 取得件数:", categories.length + totalItems, "件 (カテゴリ=", categories.length, ", 項目=", totalItems, ")");

    return NextResponse.json({ categories, items_by_category });
  } catch (error) {
    console.error("❌ ext/hearing エラー:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "ヒアリング取得に失敗しました",
      },
      { status: 500 }
    );
  }
}
