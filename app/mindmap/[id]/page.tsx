import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { verifyToken } from "@/src/lib/auth";
import { db } from "@/src/lib/db";
import MindMapCanvas from "@/src/components/mindmap/MindMapCanvas";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function MindMapEditorPage({ params }: Props) {
  const { id } = await params;

  const cookieStore = await cookies();
  const token = cookieStore.get("scouter_session")?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session) redirect("/login");

  const [mapRes, nodesRes, edgesRes] = await Promise.all([
    db.execute({
      sql: "SELECT id, title, user_id, persona_data FROM mind_maps WHERE id = ?",
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

  const mapRow = mapRes.rows[0];
  if (!mapRow) notFound();
  if ((mapRow.user_id as string) !== session.id) notFound();

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
    color:          (r.color as string) ?? "#78716C",
    bg_color:       (r.bg_color as string | null) ?? "#FFFFFF",
    border_width:   (r.border_width as number | null) ?? 1,
    pos_x:          (r.pos_x as number) ?? 0,
    pos_y:          (r.pos_y as number) ?? 0,
    width:          (r.width as number) ?? 200,
    height:         (r.height as number) ?? 80,
  }));

  const edges = edgesRes.rows.map((r) => ({
    id:             r.id as string,
    source_node_id: r.source_node_id as string,
    target_node_id: r.target_node_id as string,
    label:          r.label as string | null,
    edge_color:     r.edge_color as string | null,
    edge_width:     r.edge_width as number | null,
  }));

  return (
    <div className="flex flex-col h-screen bg-[#F7F6F4]">
      <header className="flex items-center justify-between px-5 py-3 bg-white border-b border-stone-200 shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/mindmap" className="text-stone-400 hover:text-stone-600 text-sm">
            ← 一覧
          </Link>
          <h1 className="text-sm font-bold text-[#2D2B2A] truncate max-w-xs">
            {mapRow.title as string}
          </h1>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-stone-400">
          <span>Delete キーでノード/エッジ削除</span>
          <span>•</span>
          <span>⌘↩ で子ノード追加</span>
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        <MindMapCanvas
          mapId={id}
          initialNodes={nodes}
          initialEdges={edges}
          initialPersonaData={(mapRow.persona_data as string | null) ?? null}
        />
      </div>
    </div>
  );
}
