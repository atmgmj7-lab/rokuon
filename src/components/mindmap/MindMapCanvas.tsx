"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Node, Edge, Connection, addEdge,
  useNodesState, useEdgesState,
  Controls, Background, MiniMap, BackgroundVariant,
  NodeTypes, Panel, useReactFlow, ReactFlowProvider,
  EdgeChange, NodeChange,
} from "reactflow";
import "reactflow/dist/style.css";
import { useDebounce } from "@/src/hooks/useDebounce";
import ScriptItemNode, { ScriptItemNodeData } from "./nodes/ScriptItemNode";
import TextNode,       { TextNodeData }       from "./nodes/TextNode";
import RecordingNode,  { RecordingNodeData }  from "./nodes/RecordingNode";
import SectionNode                             from "./nodes/SectionNode";
import ScriptItemPanel from "./ScriptItemPanel";
import CommandPalette, { Command } from "./CommandPalette";
import ShortcutHelp from "./ShortcutHelp";

interface DbNode {
  id: string; node_type: string; script_item_id: string | null;
  label: string; content: string | null; audio_url: string | null;
  r2_key: string | null; color: string;
  pos_x: number; pos_y: number; width: number; height: number;
}
interface DbEdge {
  id: string; source_node_id: string; target_node_id: string; label: string | null;
}
interface ScriptItem { id: string; title: string; content: string; folder_name: string; category_name: string; }

type Snapshot = { nodes: Node[]; edges: Edge[] };

const NODE_COLORS: Record<string, string> = {
  script_item: "#3B82F6", text: "#6B7280", recording: "#EF4444", section: "#F59E0B",
};

function dbNodeToRF(n: DbNode): Node {
  const base = { id: n.id, position: { x: n.pos_x, y: n.pos_y } };
  switch (n.node_type) {
    case "script_item": return { ...base, type: "scriptItem", data: { label: n.label, content: n.content, color: n.color, script_item_id: n.script_item_id }, style: { width: n.width, height: n.height } };
    case "recording":   return { ...base, type: "recording",  data: { label: n.label, audio_url: n.audio_url, r2_key: n.r2_key, color: n.color }, style: { width: n.width } };
    case "section":     return { ...base, type: "section",    data: { label: n.label, color: n.color }, style: { width: n.width, height: n.height } };
    default:            return { ...base, type: "text",       data: { label: n.label, content: n.content ?? n.label, color: n.color }, style: { width: n.width } };
  }
}
function dbEdgeToRF(e: DbEdge): Edge {
  return { id: e.id, source: e.source_node_id, target: e.target_node_id, label: e.label ?? undefined, type: "smoothstep" };
}

const nodeTypes: NodeTypes = { scriptItem: ScriptItemNode, text: TextNode, recording: RecordingNode, section: SectionNode };

// ----- 内部キャンバス（ReactFlow context 内） -----
function Canvas({ mapId, initialNodes, initialEdges }: { mapId: string; initialNodes: DbNode[]; initialEdges: DbEdge[] }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes.map(dbNodeToRF));
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges.map(dbEdgeToRF));
  const [showPanel, setShowPanel]        = useState(false);
  const [showCmd, setShowCmd]            = useState(false);
  const [saveStatus, setSaveStatus]      = useState<"saved" | "saving" | "unsaved">("saved");
  const isFirstRender = useRef(true);
  const { fitView }   = useReactFlow();

  // ----- Undo/Redo -----
  const historyRef      = useRef<Snapshot[]>([{ nodes: initialNodes.map(dbNodeToRF), edges: initialEdges.map(dbEdgeToRF) }]);
  const historyIndexRef = useRef(0);

  const pushHistory = useCallback((ns: Node[], es: Edge[]) => {
    const trimmed = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current = [...trimmed, {
      nodes: JSON.parse(JSON.stringify(ns)) as Node[],
      edges: JSON.parse(JSON.stringify(es)) as Edge[],
    }].slice(-50);
    historyIndexRef.current = historyRef.current.length - 1;
  }, []);

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current--;
    const snap = historyRef.current[historyIndexRef.current];
    setNodes(snap.nodes);
    setEdges(snap.edges);
    setSaveStatus("unsaved");
  }, [setNodes, setEdges]);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current++;
    const snap = historyRef.current[historyIndexRef.current];
    setNodes(snap.nodes);
    setEdges(snap.edges);
    setSaveStatus("unsaved");
  }, [setNodes, setEdges]);

  // ----- キーボードショートカット -----
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      if (mod && e.key === "z" &&  e.shiftKey) { e.preventDefault(); redo(); }
      if (mod && (e.key === "k" || e.key === "K")) { e.preventDefault(); setShowCmd(true); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo]);

  // ----- ノード内コールバックを注入 -----
  const nodesWithCallbacks = useMemo(
    () => nodes.map((n) => ({
      ...n,
      data: {
        ...n.data,
        onContentChange: (nodeId: string, content: string) => {
          setNodes((ns) => {
            const updated = ns.map((nd) => nd.id === nodeId ? { ...nd, data: { ...nd.data, content } } : nd);
            pushHistory(updated, edges);
            return updated;
          });
          setSaveStatus("unsaved");
        },
        onLabelChange: (nodeId: string, label: string) => {
          setNodes((ns) => {
            const updated = ns.map((nd) => nd.id === nodeId ? { ...nd, data: { ...nd.data, label } } : nd);
            pushHistory(updated, edges);
            return updated;
          });
          setSaveStatus("unsaved");
        },
        onColorChange: (nodeId: string, color: string) => {
          setNodes((ns) => {
            const updated = ns.map((nd) => nd.id === nodeId ? { ...nd, data: { ...nd.data, color } } : nd);
            pushHistory(updated, edges);
            return updated;
          });
          setSaveStatus("unsaved");
        },
        onRecordingSaved: (nodeId: string, audioUrl: string, r2Key: string) => {
          setNodes((ns) => {
            const updated = ns.map((nd) => nd.id === nodeId ? { ...nd, data: { ...nd.data, audio_url: audioUrl, r2_key: r2Key } } : nd);
            pushHistory(updated, edges);
            return updated;
          });
          setSaveStatus("unsaved");
        },
      },
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nodes, edges]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => {
        const updated = addEdge({ ...params, type: "smoothstep" }, eds);
        pushHistory(nodes, updated);
        return updated;
      });
      setSaveStatus("unsaved");
    },
    [setEdges, nodes, pushHistory]
  );

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes);
      if (changes.some((c) => c.type === "position" && !c.dragging)) {
        setNodes((ns) => { pushHistory(ns, edges); return ns; });
        setSaveStatus("unsaved");
      }
      if (changes.some((c) => c.type === "remove")) {
        setNodes((ns) => { pushHistory(ns, edges); return ns; });
        setSaveStatus("unsaved");
      }
    },
    [onNodesChange, edges, pushHistory, setNodes]
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChange(changes);
      if (changes.some((c) => c.type === "remove")) {
        setEdges((es) => { pushHistory(nodes, es); return es; });
        setSaveStatus("unsaved");
      }
    },
    [onEdgesChange, nodes, pushHistory, setEdges]
  );

  // ----- 自動保存（2秒デバウンス） -----
  const debouncedNodes = useDebounce(nodes, 2000);
  const debouncedEdges = useDebounce(edges, 2000);

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    if (saveStatus === "saved") return;
    setSaveStatus("saving");

    type AnyData = ScriptItemNodeData & TextNodeData & RecordingNodeData & { r2_key?: string; audio_url?: string; script_item_id?: string };
    const payload = {
      nodes: debouncedNodes.map((n) => {
        const d = n.data as AnyData;
        return {
          id: n.id,
          node_type:      n.type === "scriptItem" ? "script_item" : (n.type ?? "text"),
          label:          d.label ?? "",
          content:        d.content ?? null,
          audio_url:      d.audio_url ?? null,
          r2_key:         d.r2_key ?? null,
          script_item_id: d.script_item_id ?? null,
          color:          d.color ?? "#3B82F6",
          pos_x:          n.position.x,
          pos_y:          n.position.y,
          width:  (n.style?.width  as number | undefined) ?? 200,
          height: (n.style?.height as number | undefined) ?? 80,
        };
      }),
      edges: debouncedEdges.map((e) => ({
        id: e.id, source_node_id: e.source, target_node_id: e.target,
        label: (e.label as string | undefined) ?? null,
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
  const addNode = useCallback((type: string, extra?: Partial<DbNode>) => {
    const id   = `node_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
    const node: Node = {
      id,
      position: { x: 80 + Math.random() * 220, y: 80 + Math.random() * 220 },
      type:     type === "script_item" ? "scriptItem" : type,
      data:     { label: extra?.label ?? "新しいノード", content: extra?.content ?? null, color: NODE_COLORS[type] ?? "#6B7280", script_item_id: extra?.script_item_id ?? null, audio_url: null },
      ...(type === "section" ? { style: { width: 300, height: 200 } } : {}),
    };
    setNodes((ns) => { const updated = [...ns, node]; pushHistory(updated, edges); return updated; });
    setSaveStatus("unsaved");
  }, [setNodes, edges, pushHistory]);

  const handleScriptItemAdd = useCallback((item: ScriptItem) => {
    const id = `node_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
    setNodes((ns) => {
      const updated = [...ns, {
        id, position: { x: 150 + Math.random() * 150, y: 150 + Math.random() * 150 },
        type: "scriptItem",
        data: { label: item.title, content: item.content, color: NODE_COLORS.script_item, script_item_id: item.id },
      }];
      pushHistory(updated, edges);
      return updated;
    });
    setSaveStatus("unsaved");
    setShowPanel(false);
  }, [setNodes, edges, pushHistory]);

  // ----- コマンドパレット定義 -----
  const commands: Command[] = useMemo(() => [
    { id: "add-text",     label: "テキストノードを追加",     icon: "✏️", group: "ノード追加",  action: () => addNode("text") },
    { id: "add-script",   label: "スクリプトノードを追加",   icon: "📋", group: "ノード追加",  action: () => addNode("script_item", { label: "スクリプト" }) },
    { id: "add-recording",label: "録音ノードを追加",         icon: "🎙️", group: "ノード追加",  action: () => addNode("recording", { label: "録音メモ" }) },
    { id: "add-section",  label: "セクションノードを追加",   icon: "🗂️", group: "ノード追加",  action: () => addNode("section",   { label: "セクション" }) },
    { id: "open-scripts", label: "スクリプト一覧パネルを開く", icon: "📂", group: "パネル",     action: () => setShowPanel(true) },
    { id: "undo",         label: "元に戻す (Undo)",          icon: "↩️", group: "編集", shortcut: "⌘Z",       action: undo },
    { id: "redo",         label: "やり直す (Redo)",          icon: "↪️", group: "編集", shortcut: "⌘⇧Z",      action: redo },
    { id: "fit-view",     label: "全体を表示 (Fit View)",    icon: "🔍", group: "表示",                        action: () => fitView({ duration: 300 }) },
  ], [addNode, undo, redo, fitView]);

  return (
    <div className="flex h-full w-full relative">
      <div className="flex-1">
        <ReactFlow
          nodes={nodesWithCallbacks}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          deleteKeyCode={["Delete", "Backspace"]}
        >
          <Controls />
          <MiniMap nodeStrokeWidth={3} zoomable pannable />
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#e5e7eb" />

          {/* ツールバー */}
          <Panel position="top-left">
            <div className="flex items-center gap-1.5 bg-white border border-stone-200 rounded-xl px-3 py-2 shadow-sm flex-wrap">
              <button onClick={() => addNode("text")}
                className="px-2 py-1 text-[11px] bg-stone-100 hover:bg-stone-200 rounded-lg text-stone-600" title="テキスト追加">
                ✏️ テキスト
              </button>
              <button onClick={() => addNode("recording", { label: "録音メモ" })}
                className="px-2 py-1 text-[11px] bg-red-50 hover:bg-red-100 rounded-lg text-red-600" title="録音追加">
                🎙️ 録音
              </button>
              <button onClick={() => addNode("section", { label: "セクション" })}
                className="px-2 py-1 text-[11px] bg-amber-50 hover:bg-amber-100 rounded-lg text-amber-600" title="セクション追加">
                🗂️ セクション
              </button>
              <button onClick={() => setShowPanel((v) => !v)}
                className={`px-2 py-1 text-[11px] rounded-lg font-medium ${showPanel ? "bg-blue-500 text-white" : "bg-blue-50 text-blue-600 hover:bg-blue-100"}`}>
                📋 スクリプト
              </button>
              <div className="w-px h-4 bg-stone-200 mx-0.5" />
              <button onClick={undo}
                className="px-2 py-1 text-[11px] bg-stone-50 hover:bg-stone-100 rounded-lg text-stone-500" title="元に戻す (⌘Z)">↩</button>
              <button onClick={redo}
                className="px-2 py-1 text-[11px] bg-stone-50 hover:bg-stone-100 rounded-lg text-stone-500" title="やり直す (⌘⇧Z)">↪</button>
              <button onClick={() => setShowCmd(true)}
                className="px-2 py-1 text-[11px] bg-stone-700 hover:bg-stone-800 rounded-lg text-white font-medium" title="コマンドパレット (⌘K)">
                ⌘K
              </button>
              <span className="ml-1 text-[10px] text-stone-400">
                {saveStatus === "saving" ? "💾 保存中..." : saveStatus === "saved" ? "✓ 保存済み" : "● 未保存"}
              </span>
            </div>
          </Panel>
        </ReactFlow>
      </div>

      {/* スクリプトパネル */}
      {showPanel && (
        <ScriptItemPanel onAdd={handleScriptItemAdd} onClose={() => setShowPanel(false)} />
      )}

      {/* コマンドパレット */}
      {showCmd && (
        <CommandPalette commands={commands} onClose={() => setShowCmd(false)} />
      )}

      {/* ショートカットヘルプ */}
      <ShortcutHelp />
    </div>
  );
}

// ----- エクスポート: ReactFlowProvider でラップ -----
interface Props { mapId: string; initialNodes: DbNode[]; initialEdges: DbEdge[]; }

export default function MindMapCanvas(props: Props) {
  return (
    <ReactFlowProvider>
      <Canvas {...props} />
    </ReactFlowProvider>
  );
}
