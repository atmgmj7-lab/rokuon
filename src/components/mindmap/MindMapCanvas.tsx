"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Node, Edge, Connection, addEdge,
  useNodesState, useEdgesState,
  Controls, Background, MiniMap, BackgroundVariant,
  NodeTypes, Panel,
} from "reactflow";
import "reactflow/dist/style.css";
import { useDebounce } from "@/src/hooks/useDebounce";
import ScriptItemNode, { ScriptItemNodeData } from "./nodes/ScriptItemNode";
import TextNode,       { TextNodeData }       from "./nodes/TextNode";
import RecordingNode,  { RecordingNodeData }  from "./nodes/RecordingNode";
import SectionNode,    { SectionNodeData }    from "./nodes/SectionNode";
import ScriptItemPanel from "./ScriptItemPanel";

interface DbNode {
  id: string;
  node_type: string;
  script_item_id: string | null;
  label: string;
  content: string | null;
  audio_url: string | null;
  r2_key: string | null;
  color: string;
  pos_x: number;
  pos_y: number;
  width: number;
  height: number;
}

interface DbEdge {
  id: string;
  source_node_id: string;
  target_node_id: string;
  label: string | null;
}

interface ScriptItem {
  id: string;
  title: string;
  content: string;
  folder_name: string;
  category_name: string;
}

function dbNodeToRF(n: DbNode): Node {
  const base = {
    id:       n.id,
    position: { x: n.pos_x, y: n.pos_y },
    style:    n.node_type === "section" ? { width: n.width, height: n.height } : undefined,
  };

  switch (n.node_type) {
    case "script_item":
      return { ...base, type: "scriptItem", data: { label: n.label, content: n.content, color: n.color } };
    case "recording":
      return { ...base, type: "recording", data: { label: n.label, audio_url: n.audio_url, color: n.color } };
    case "section":
      return { ...base, type: "section", data: { label: n.label, color: n.color } };
    default:
      return { ...base, type: "text", data: { label: n.label, content: n.content ?? n.label, color: n.color } };
  }
}

function dbEdgeToRF(e: DbEdge): Edge {
  return {
    id:     e.id,
    source: e.source_node_id,
    target: e.target_node_id,
    label:  e.label ?? undefined,
    type:   "smoothstep",
    animated: false,
  };
}

const NODE_COLORS: Record<string, string> = {
  script_item: "#3B82F6",
  text:        "#6B7280",
  recording:   "#EF4444",
  section:     "#F59E0B",
};

interface Props {
  mapId: string;
  initialNodes: DbNode[];
  initialEdges: DbEdge[];
}

export default function MindMapCanvas({ mapId, initialNodes, initialEdges }: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes.map(dbNodeToRF));
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges.map(dbEdgeToRF));
  const [showPanel, setShowPanel]     = useState(false);
  const [saveStatus, setSaveStatus]   = useState<"saved" | "saving" | "unsaved">("saved");
  const isFirstRender = useRef(true);

  // ノード内コールバックをデータへ注入
  const nodesWithCallbacks = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        data: {
          ...n.data,
          onContentChange: (nodeId: string, content: string) => {
            setNodes((ns) =>
              ns.map((nd) => nd.id === nodeId ? { ...nd, data: { ...nd.data, content } } : nd)
            );
            setSaveStatus("unsaved");
          },
          onLabelChange: (nodeId: string, label: string) => {
            setNodes((ns) =>
              ns.map((nd) => nd.id === nodeId ? { ...nd, data: { ...nd.data, label } } : nd)
            );
            setSaveStatus("unsaved");
          },
          onRecordingSaved: (nodeId: string, audioUrl: string, r2Key: string) => {
            setNodes((ns) =>
              ns.map((nd) =>
                nd.id === nodeId ? { ...nd, data: { ...nd.data, audio_url: audioUrl, r2_key: r2Key } } : nd
              )
            );
            setSaveStatus("unsaved");
          },
        },
      })),
    [nodes, setNodes]
  );

  const nodeTypes: NodeTypes = useMemo(
    () => ({
      scriptItem: ScriptItemNode,
      text:       TextNode,
      recording:  RecordingNode,
      section:    SectionNode,
    }),
    []
  );

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge({ ...params, type: "smoothstep" }, eds));
      setSaveStatus("unsaved");
    },
    [setEdges]
  );

  const handleNodesChange = useCallback(
    (changes: Parameters<typeof onNodesChange>[0]) => {
      onNodesChange(changes);
      const hasPosition = changes.some((c) => c.type === "position" && c.dragging === false);
      if (hasPosition) setSaveStatus("unsaved");
    },
    [onNodesChange]
  );

  const handleEdgesChange = useCallback(
    (changes: Parameters<typeof onEdgesChange>[0]) => {
      onEdgesChange(changes);
      if (changes.some((c) => c.type === "remove")) setSaveStatus("unsaved");
    },
    [onEdgesChange]
  );

  // ----- 自動保存（2秒デバウンス） -----
  const debouncedNodes = useDebounce(nodes, 2000);
  const debouncedEdges = useDebounce(edges, 2000);

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    if (saveStatus === "saved") return;

    setSaveStatus("saving");

    const payload = {
      nodes: debouncedNodes.map((n) => ({
        id:             n.id,
        node_type:      n.type === "scriptItem" ? "script_item" : n.type ?? "text",
        label:          (n.data as ScriptItemNodeData).label ?? "",
        content:        (n.data as TextNodeData).content ?? null,
        audio_url:      (n.data as RecordingNodeData).audio_url ?? null,
        r2_key:         (n.data as RecordingNodeData & { r2_key?: string }).r2_key ?? null,
        script_item_id: (n.data as ScriptItemNodeData & { script_item_id?: string }).script_item_id ?? null,
        color:          (n.data as ScriptItemNodeData).color ?? "#3B82F6",
        pos_x:          n.position.x,
        pos_y:          n.position.y,
        width:          n.style?.width as number ?? 200,
        height:         n.style?.height as number ?? 80,
      })),
      edges: debouncedEdges.map((e) => ({
        id:             e.id,
        source_node_id: e.source,
        target_node_id: e.target,
        label:          e.label as string ?? null,
      })),
    };

    fetch(`/api/mind-maps/${mapId}/canvas`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((r) => r.json())
      .then((j: { success: boolean }) => setSaveStatus(j.success ? "saved" : "unsaved"))
      .catch(() => setSaveStatus("unsaved"));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedNodes, debouncedEdges]);

  // ----- ノード追加ヘルパー -----
  const addNode = (type: string, extra?: Partial<DbNode>) => {
    const id = `node_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
    const base: Node = {
      id,
      position: { x: 100 + Math.random() * 200, y: 100 + Math.random() * 200 },
      type:     type === "script_item" ? "scriptItem" : type,
      data:     {
        label:          extra?.label ?? "新しいノード",
        content:        extra?.content ?? null,
        color:          NODE_COLORS[type] ?? "#6B7280",
        script_item_id: extra?.script_item_id ?? null,
        audio_url:      null,
      },
      ...(type === "section" ? { style: { width: 300, height: 200 } } : {}),
    };
    setNodes((ns) => [...ns, base]);
    setSaveStatus("unsaved");
  };

  const handleScriptItemAdd = (item: ScriptItem) => {
    const id = `node_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
    setNodes((ns) => [
      ...ns,
      {
        id,
        position: { x: 150 + Math.random() * 150, y: 150 + Math.random() * 150 },
        type:     "scriptItem",
        data: {
          label:          item.title,
          content:        item.content,
          color:          NODE_COLORS.script_item,
          script_item_id: item.id,
        },
      },
    ]);
    setSaveStatus("unsaved");
    setShowPanel(false);
  };

  return (
    <div className="flex h-full w-full">
      {/* キャンバス */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodesWithCallbacks}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          deleteKeyCode="Delete"
        >
          <Controls />
          <MiniMap nodeStrokeWidth={3} zoomable pannable />
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#e5e7eb" />

          {/* ツールバー */}
          <Panel position="top-left">
            <div className="flex items-center gap-2 bg-white border border-stone-200 rounded-xl px-3 py-2 shadow-sm">
              <button
                onClick={() => addNode("text")}
                className="px-2 py-1 text-[11px] bg-stone-100 hover:bg-stone-200 rounded-lg text-stone-600"
                title="テキストノードを追加"
              >
                ✏️ テキスト
              </button>
              <button
                onClick={() => addNode("recording", { label: "録音メモ" })}
                className="px-2 py-1 text-[11px] bg-red-50 hover:bg-red-100 rounded-lg text-red-600"
                title="録音ノードを追加"
              >
                🎙️ 録音
              </button>
              <button
                onClick={() => addNode("section", { label: "セクション" })}
                className="px-2 py-1 text-[11px] bg-amber-50 hover:bg-amber-100 rounded-lg text-amber-600"
                title="セクションノードを追加"
              >
                🗂️ セクション
              </button>
              <button
                onClick={() => setShowPanel((v) => !v)}
                className={`px-2 py-1 text-[11px] rounded-lg font-medium ${
                  showPanel ? "bg-blue-500 text-white" : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                }`}
                title="スクリプトから追加"
              >
                📋 スクリプト
              </button>

              <span className="ml-2 text-[10px] text-stone-400">
                {saveStatus === "saving" ? "💾 保存中..." : saveStatus === "saved" ? "✓ 保存済み" : "● 未保存"}
              </span>
            </div>
          </Panel>
        </ReactFlow>
      </div>

      {/* スクリプトパネル */}
      {showPanel && (
        <ScriptItemPanel
          onAdd={handleScriptItemAdd}
          onClose={() => setShowPanel(false)}
        />
      )}
    </div>
  );
}
