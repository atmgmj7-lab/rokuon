import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/lib/db";
import { getSessionFromRequest } from "@/src/lib/auth-request";

type Params = { params: Promise<{ id: string }> };

async function getMapAndCheckOwner(mapId: string, userId: string) {
  const res = await db.execute({
    sql: "SELECT id, user_id FROM mind_maps WHERE id = ?",
    args: [mapId],
  });
  const row = res.rows[0];
  if (!row) return { error: "見つかりません", status: 404 };
  if ((row.user_id as string) !== userId) return { error: "権限がありません", status: 403 };
  return { ok: true };
}

export async function GET(request: NextRequest, { params }: Params) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ success: false, error: "認証が必要です" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const check = await getMapAndCheckOwner(id, session.id);
    if ("error" in check) {
      return NextResponse.json({ success: false, error: check.error }, { status: check.status });
    }

    const [mapRes, nodesRes, edgesRes] = await Promise.all([
      db.execute({
        sql: "SELECT id, title, description, persona_data, created_at, updated_at FROM mind_maps WHERE id = ?",
        args: [id],
      }),
      db.execute({
        sql: `SELECT id, node_type, script_item_id, title, label, content, audio_url, r2_key,
               parent_id, color, bg_color, border_width, pos_x, pos_y, width, height
               FROM map_nodes WHERE map_id = ? ORDER BY created_at ASC`,
        args: [id],
      }),
      db.execute({
        sql: "SELECT id, source_node_id, target_node_id, label, edge_color, edge_width FROM map_edges WHERE map_id = ?",
        args: [id],
      }),
    ]);

    const map = mapRes.rows[0];
    const nodes = nodesRes.rows.map((r) => ({
      id:             r.id as string,
      node_type:      r.node_type as string,
      script_item_id: r.script_item_id as string | null,
      title:          (r.title as string | null) ?? null,
      label:          r.label as string,
      content:        r.content as string | null,
      audio_url:      r.audio_url as string | null,
      r2_key:         r.r2_key as string | null,
      parent_id:      (r.parent_id as string | null) ?? null,
      color:          r.color as string,
      bg_color:       (r.bg_color as string | null) ?? "#FFFFFF",
      border_width:   (r.border_width as number | null) ?? 1,
      pos_x:          r.pos_x as number,
      pos_y:          r.pos_y as number,
      width:          r.width as number,
      height:         r.height as number,
    }));
    const edges = edgesRes.rows.map((r) => ({
      id:             r.id as string,
      source_node_id: r.source_node_id as string,
      target_node_id: r.target_node_id as string,
      label:          r.label as string | null,
      edge_color:     r.edge_color as string | null,
      edge_width:     r.edge_width as number | null,
    }));

    return NextResponse.json({
      success: true,
      data: {
        map: {
          id:           map.id as string,
          title:        map.title as string,
          description:  map.description as string | null,
          persona_data: map.persona_data as string | null,
          created_at:   map.created_at as number,
          updated_at:   map.updated_at as number,
        },
        nodes,
        edges,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "取得に失敗しました" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ success: false, error: "認証が必要です" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const check = await getMapAndCheckOwner(id, session.id);
    if ("error" in check) {
      return NextResponse.json({ success: false, error: check.error }, { status: check.status });
    }

    const body = await request.json() as { title?: string; description?: string; persona_data?: string };
    const now  = Date.now();

    const setClauses: string[] = ["updated_at = ?"];
    const args: (string | number | null)[] = [now];

    if (body.title        !== undefined) { setClauses.unshift("title = ?");        args.unshift(body.title); }
    if (body.description  !== undefined) { setClauses.unshift("description = ?");  args.unshift(body.description); }
    if (body.persona_data !== undefined) { setClauses.unshift("persona_data = ?"); args.unshift(body.persona_data); }

    args.push(id);

    await db.execute({
      sql: `UPDATE mind_maps SET ${setClauses.join(", ")} WHERE id = ?`,
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

export async function DELETE(request: NextRequest, { params }: Params) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ success: false, error: "認証が必要です" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const check = await getMapAndCheckOwner(id, session.id);
    if ("error" in check) {
      return NextResponse.json({ success: false, error: check.error }, { status: check.status });
    }

    await db.execute({ sql: "DELETE FROM mind_maps WHERE id = ?", args: [id] });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "削除に失敗しました" },
      { status: 500 }
    );
  }
}
