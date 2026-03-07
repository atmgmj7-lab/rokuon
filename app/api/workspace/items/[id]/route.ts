/**
 * PATCH /api/workspace/items/[id]
 * マインドマップ上でのスクリプト編集をワークスペース（script_items）へ同期
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/lib/db";
import { getSessionFromRequest } from "@/src/lib/auth-request";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ success: false, error: "認証が必要です" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json() as { title?: string; content?: string };
    const now = Date.now();

    const setClauses: string[] = [];
    const args: (string | number)[] = [];

    if (body.title   !== undefined) { setClauses.push("title = ?");   args.push(body.title); }
    if (body.content !== undefined) { setClauses.push("content = ?"); args.push(body.content); }

    if (setClauses.length === 0) {
      return NextResponse.json({ success: false, error: "更新フィールドが必要です" }, { status: 400 });
    }

    setClauses.push("updated_at = ?");
    args.push(now, id);

    await db.execute({
      sql: `UPDATE script_items SET ${setClauses.join(", ")} WHERE id = ?`,
      args,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "更新に失敗しました" },
      { status: 500 }
    );
  }
}
