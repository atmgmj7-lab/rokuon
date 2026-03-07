import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/lib/db";
import { getSessionFromRequest } from "@/src/lib/auth-request";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ success: false, error: "認証が必要です" }, { status: 401 });
  }

  try {
    const result = await db.execute(`
      SELECT
        si.id,
        si.title,
        si.content,
        sf.name  AS folder_name,
        COALESCE(sc.name, '') AS category_name
      FROM script_items si
      JOIN script_folders sf ON si.folder_id = sf.id
      LEFT JOIN script_categories sc ON sf.category_id = sc.id
      ORDER BY sc.name, sf.sort_order, si.sort_order
    `);

    const data = result.rows.map((r) => ({
      id:            r.id as string,
      title:         r.title as string,
      content:       r.content as string,
      folder_name:   r.folder_name as string,
      category_name: r.category_name as string,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "取得に失敗しました" },
      { status: 500 }
    );
  }
}
