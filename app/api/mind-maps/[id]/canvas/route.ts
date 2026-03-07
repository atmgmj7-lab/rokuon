/**
 * PUT /api/mind-maps/[id]/canvas
 * ノード・エッジをまとめて保存（差分ではなく全件置換）
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/lib/db";
import { getSessionFromRequest } from "@/src/lib/auth-request";

type Params = { params: Promise<{ id: string }> };

interface NodePayload {
  id: string;
  node_type: string;
  script_item_id?: string | null;
  title?: string;
  label: string;
  content?: string | null;
  audio_url?: string | null;
  r2_key?: string | null;
  parent_id?: string | null;
  color?: string;
  pos_x: number;
  pos_y: number;
  width?: number;
  height?: number;
}

interface EdgePayload {
  id: string;
  source_node_id: string;
  target_node_id: string;
  label?: string | null;
}

export async function PUT(request: NextRequest, { params }: Params) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ success: false, error: "認証が必要です" }, { status: 401 });
  }

  const { id: mapId } = await params;

  try {
    // オーナー確認
    const ownerRes = await db.execute({
      sql: "SELECT user_id FROM mind_maps WHERE id = ?",
      args: [mapId],
    });
    const row = ownerRes.rows[0];
    if (!row) return NextResponse.json({ success: false, error: "見つかりません" }, { status: 404 });
    if ((row.user_id as string) !== session.id) {
      return NextResponse.json({ success: false, error: "権限がありません" }, { status: 403 });
    }

    const body = await request.json() as { nodes: NodePayload[]; edges: EdgePayload[] };
    const now  = Date.now();

    // 既存ノード・エッジを削除してから再挿入（シンプルな全件置換）
    const statements: { sql: string; args: (string | number | null)[] }[] = [];

    statements.push({ sql: "DELETE FROM map_edges WHERE map_id = ?", args: [mapId] });
    statements.push({ sql: "DELETE FROM map_nodes WHERE map_id = ?", args: [mapId] });

    for (const n of body.nodes) {
      statements.push({
        sql: `INSERT INTO map_nodes
              (id, map_id, node_type, script_item_id, title, label, content, audio_url, r2_key, parent_id, color, pos_x, pos_y, width, height, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          n.id, mapId, n.node_type, n.script_item_id ?? null,
          n.title ?? n.label,
          n.label, n.content ?? null, n.audio_url ?? null, n.r2_key ?? null,
          n.parent_id ?? null,
          n.color ?? "#3B82F6", n.pos_x, n.pos_y,
          n.width ?? 200, n.height ?? 80,
          now, now,
        ],
      });
    }

    for (const e of body.edges) {
      statements.push({
        sql: "INSERT INTO map_edges (id, map_id, source_node_id, target_node_id, label, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        args: [e.id, mapId, e.source_node_id, e.target_node_id, e.label ?? null, now],
      });
    }

    // updated_at 更新
    statements.push({
      sql: "UPDATE mind_maps SET updated_at = ? WHERE id = ?",
      args: [now, mapId],
    });

    await db.batch(statements, "write");

    return NextResponse.json({ success: true, saved_at: now });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "保存に失敗しました" },
      { status: 500 }
    );
  }
}
