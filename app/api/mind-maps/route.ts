import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/lib/db";
import { getSessionFromRequest } from "@/src/lib/auth-request";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ success: false, error: "認証が必要です" }, { status: 401 });
  }

  try {
    const result = await db.execute({
      sql: "SELECT id, title, description, created_at, updated_at FROM mind_maps WHERE user_id = ? ORDER BY updated_at DESC",
      args: [session.id],
    });

    const maps = result.rows.map((r) => ({
      id: r.id as string,
      title: r.title as string,
      description: r.description as string | null,
      created_at: r.created_at as number,
      updated_at: r.updated_at as number,
    }));

    return NextResponse.json({ success: true, data: maps });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "取得に失敗しました" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ success: false, error: "認証が必要です" }, { status: 401 });
  }

  try {
    const body = await request.json() as { title?: string; description?: string };
    const title = (body.title ?? "新しいマインドマップ").trim();

    const id  = `mm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = Date.now();

    await db.execute({
      sql: "INSERT INTO mind_maps (id, user_id, title, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      args: [id, session.id, title, body.description ?? null, now, now],
    });

    return NextResponse.json({ success: true, data: { id, title } }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "作成に失敗しました" },
      { status: 500 }
    );
  }
}
