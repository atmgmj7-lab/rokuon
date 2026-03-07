"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Node, Edge, Connection, addEdge,
  useNodesState, useEdgesState,
  Controls, Background, MiniMap, BackgroundVariant,
  NodeTypes, EdgeTypes, Panel, useReactFlow, ReactFlowProvider,
  EdgeChange, NodeChange,
} from "reactflow";
import "reactflow/dist/style.css";
import { useDebounce } from "@/src/hooks/useDebounce";
import ScriptItemNode, { ScriptItemNodeData } from "./nodes/ScriptItemNode";
import TextNode,        { TextNodeData }       from "./nodes/TextNode";
import RecordingNode,   { RecordingNodeData }  from "./nodes/RecordingNode";
import SectionNode,     { SectionNodeData }    from "./nodes/SectionNode";
import StrategyNode,    { StrategyNodeData }   from "./nodes/StrategyNode";
import LabeledEdge,     { LabeledEdgeData, EdgePathType } from "./edges/LabeledEdge";
import ScriptItemPanel from "./ScriptItemPanel";
import CommandPalette, { Command } from "./CommandPalette";
import ShortcutHelp from "./ShortcutHelp";
import {
  Clipboard, FileText, LayoutGrid, Lightbulb,
  MessageSquare, Mic, Plus, Redo2, Target, Undo2,
} from "lucide-react";

interface DbNode {
  id: string; node_type: string; script_item_id: string | null;
  title?: string | null;
  label: string; content: string | null; audio_url: string | null;
  parent_id?: string | null;
  r2_key: string | null; color: string;
  pos_x: number; pos_y: number; width: number; height: number;
}
interface DbEdge {
  id: string; source_node_id: string; target_node_id: string; label: string | null;
}
interface ScriptItem { id: string; title: string; content: string; folder_name: string; category_name: string; }
type Snapshot = { nodes: Node[]; edges: Edge[] };

const NODE_COLORS: Record<string, string> = {
  script_item: "#C2410C", text: "#78716C", recording: "#EF4444", section: "#D97706",
  strategy1: "#EF4444", strategy2: "#3B82F6", strategy3: "#10B981",
};

function dbNodeToRF(n: DbNode): Node {
  const base     = { id: n.id, position: { x: n.pos_x, y: n.pos_y } };
  const label    = (n.title ?? n.label) || n.label;
  const baseData = { label, audio_url: n.audio_url, r2_key: n.r2_key, parent_id: n.parent_id ?? null };

  switch (n.node_type) {
    case "script_item":
      // height は自動サイズのため設定しない（「続きを見る」展開対応）
      return { ...base, type: "scriptItem", data: { ...baseData, content: n.content, color: n.color, script_item_id: n.script_item_id }, style: { width: n.width } };
    case "recording":
      return { ...base, type: "recording",  data: { ...baseData, color: n.color }, style: { width: n.width } };
    case "section":
      return { ...base, type: "section",    data: { ...baseData, color: n.color }, style: { width: n.width, height: n.height } };
    case "strategy1": case "strategy2": case "strategy3":
      return { ...base, type: n.node_type,  data: { ...baseData, color: n.color }, style: { width: n.width } };
    default:
      // text も自動サイズ
      return { ...base, type: "text",       data: { ...baseData, content: n.content ?? label, color: n.color }, style: { width: n.width } };
  }
}

function dbEdgeToRF(e: DbEdge): Edge {
  return { id: e.id, source: e.source_node_id, target: e.target_node_id, label: e.label ?? "If...", type: "labeled" };
}

const nodeTypes: NodeTypes = {
  scriptItem: ScriptItemNode,
  text:       TextNode,
  recording:  RecordingNode,
  section:    SectionNode,
  strategy1:  StrategyNode,
  strategy2:  StrategyNode,
  strategy3:  StrategyNode,
};
const edgeTypes: EdgeTypes = { labeled: LabeledEdge };

type ViewMode = "map" | "outline";

function safeRepeatSpaces(d: number) { return "  ".repeat(Math.max(0, d)); }

function buildParentMap(nodes: Node[], edges: Edge[]) {
  const byId   = new Map(nodes.map((n) => [n.id, n]));
  const parent = new Map<string, string>();
  for (const n of nodes) {
    const pid = (n.data as { parent_id?: string | null } | undefined)?.parent_id;
    if (pid && byId.has(pid)) parent.set(n.id, pid);
  }
  for (const e of edges) {
    if (!parent.has(e.target) && byId.has(e.source) && byId.has(e.target)) parent.set(e.target, e.source);
  }
  return parent;
}

function buildOutlineLines(nodes: Node[], edges: Edge[]) {
  const parentMap = buildParentMap(nodes, edges);
  const children  = new Map<string, string[]>();
  const roots: string[] = [];
  const nodeById  = new Map(nodes.map((n) => [n.id, n]));

  for (const n of nodes) {
    const pid = parentMap.get(n.id);
    if (!pid || !nodeById.has(pid)) { roots.push(n.id); }
    else { if (!children.has(pid)) children.set(pid, []); children.get(pid)!.push(n.id); }
  }

  const sortIds = (ids: string[]) =>
    ids.slice().sort((a, b) => (nodeById.get(a)?.position.y ?? 0) - (nodeById.get(b)?.position.y ?? 0));

  const TIER_PREFIX: Record<string, string> = {
    strategy1: "[代表アウト] ", strategy2: "[代表心理] ", strategy3: "[実行] ",
  };
  const lines: string[] = [];
  const walk = (id: string, depth: number) => {
    const n = nodeById.get(id);
    if (!n) return;
    const title  = String((n.data as { label?: string } | undefined)?.label ?? "無題").trim() || "無題";
    const prefix = TIER_PREFIX[n.type ?? ""] ?? "";
    lines.push(`${safeRepeatSpaces(depth)}- ${prefix}${title}`);
    for (const childId of sortIds(children.get(id) ?? [])) walk(childId, depth + 1);
  };
  for (const rootId of sortIds(roots)) walk(rootId, 0);
  return { lines, parentMap };
}

// ---------- Canvas ----------
function Canvas({ mapId, initialNodes, initialEdges }: { mapId: string; initialNodes: DbNode[]; initialEdges: DbEdge[] }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes.map(dbNodeToRF));
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges.map(dbEdgeToRF));
  const [showPanel,   setShowPanel]   = useState(false);
  const [showCmd,     setShowCmd]     = useState(false);
  const [viewMode,    setViewMode]    = useState<ViewMode>("map");
  const [saveStatus,  setSaveStatus]  = useState<"saved" | "saving" | "unsaved">("saved");
  const [edgePathType, setEdgePathType] = useState<EdgePathType>("smoothstep");
  const isFirstRender = useRef(true);
  const syncTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    setNodes(snap.nodes); setEdges(snap.edges); setSaveStatus("unsaved");
  }, [setNodes, setEdges]);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current++;
    const snap = historyRef.current[historyIndexRef.current];
    setNodes(snap.nodes); setEdges(snap.edges); setSaveStatus("unsaved");
  }, [setNodes, setEdges]);

  // ----- Workspace sync (debounced) -----
  const syncToWorkspace = useCallback((scriptItemId: string, title: string, content: string) => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      fetch(`/api/workspace/items/${scriptItemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      }).catch(() => {});
    }, 1500);
  }, []);

  // ----- Callbacks injected into nodes -----
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
        onAudioDeleted: (nodeId: string) => {
          setNodes((ns) => {
            const updated = ns.map((nd) => nd.id === nodeId ? { ...nd, data: { ...nd.data, audio_url: null, r2_key: null } } : nd);
            pushHistory(updated, edges);
            return updated;
          });
          setSaveStatus("unsaved");
        },
        onScriptSync: (scriptItemId: string, title: string, content: string) => {
          syncToWorkspace(scriptItemId, title, content);
        },
      },
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nodes, edges]
  );

  // ----- Edge callbacks + path type injection -----
  const edgesWithCallbacks = useMemo(
    () => edges.map((e) => ({
      ...e,
      type: "labeled",
      data: {
        ...e.data,
        pathType: edgePathType,
        onLabelChange: (edgeId: string, newLabel: string) => {
          setEdges((es) => {
            const updated = es.map((edge) => edge.id === edgeId ? { ...edge, label: newLabel } : edge);
            pushHistory(nodes, updated);
            return updated;
          });
          setSaveStatus("unsaved");
        },
      } as LabeledEdgeData,
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [edges, nodes, edgePathType]
  );

  // ----- Connect: LR のみ許可 / 自動 "If..." -----
  const isValidConnection = useCallback((conn: Connection) => {
    // source が right ハンドル、target が left ハンドルのみ許可
    const srcOk = !conn.sourceHandle || conn.sourceHandle === "right";
    const tgtOk = !conn.targetHandle || conn.targetHandle === "left";
    return srcOk && tgtOk;
  }, []);

  const onConnect = useCallback((params: Connection) => {
    if (!isValidConnection(params)) return;
    setEdges((eds) => {
      const updated = addEdge({ ...params, type: "labeled", label: "If..." }, eds);
      pushHistory(nodes, updated);
      return updated;
    });
    if (params.source && params.target) {
      const parentMap = buildParentMap(nodes, edges);
      let cur: string | undefined = params.source;
      const seen = new Set<string>(); let ok = true;
      while (cur && parentMap.has(cur)) {
        if (seen.has(cur)) break; seen.add(cur); cur = parentMap.get(cur);
        if (cur === params.target) { ok = false; break; }
      }
      if (ok) setNodes((ns) => ns.map((n) => n.id === params.target ? { ...n, data: { ...n.data, parent_id: params.source } } : n));
    }
    setSaveStatus("unsaved");
  }, [setEdges, setNodes, nodes, edges, pushHistory, isValidConnection]);

  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    onNodesChange(changes);
    if (changes.some((c) => c.type === "position" && !c.dragging)) {
      setNodes((ns) => { pushHistory(ns, edges); return ns; }); setSaveStatus("unsaved");
    }
    if (changes.some((c) => c.type === "remove")) {
      setNodes((ns) => { pushHistory(ns, edges); return ns; }); setSaveStatus("unsaved");
    }
  }, [onNodesChange, edges, pushHistory, setNodes]);

  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    const removedIds = changes.filter((c) => c.type === "remove").map((c) => (c as { id?: string }).id).filter(Boolean) as string[];
    onEdgesChange(changes);
    if (changes.some((c) => c.type === "remove")) {
      setEdges((es) => {
        if (removedIds.length > 0) {
          const removed = new Set(removedIds);
          const removedEdges = edges.filter((e) => removed.has(e.id));
          if (removedEdges.length > 0) {
            setNodes((ns) => ns.map((n) => {
              const pid = (n.data as { parent_id?: string | null } | undefined)?.parent_id ?? null;
              return removedEdges.some((re) => re.target === n.id && re.source === pid)
                ? { ...n, data: { ...n.data, parent_id: null } } : n;
            }));
          }
        }
        pushHistory(nodes, es); return es;
      });
      setSaveStatus("unsaved");
    }
  }, [onEdgesChange, nodes, pushHistory, setEdges, edges, setNodes]);

  // ----- Add nodes -----
  const addNode = useCallback((type: string, extra?: Partial<DbNode>) => {
    const id = `node_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
    const node: Node = {
      id,
      position: { x: 80 + Math.random() * 220, y: 80 + Math.random() * 220 },
      type: type === "script_item" ? "scriptItem" : type,
      data: { label: extra?.label ?? "新しいノード", content: extra?.content ?? null, color: NODE_COLORS[type] ?? "#78716C", script_item_id: extra?.script_item_id ?? null, audio_url: null },
      ...(type === "section" ? { style: { width: 300, height: 200 } } : {}),
    };
    setNodes((ns) => { const u = [...ns, node]; pushHistory(u, edges); return u; });
    setSaveStatus("unsaved");
  }, [setNodes, edges, pushHistory]);

  const addStrategyNode = useCallback((tier: 1 | 2 | 3, position?: { x: number; y: number }) => {
    const id     = `node_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
    const labels = { 1: "代表アウトを入力", 2: "代表心理を入力", 3: "実行策を入力" } as const;
    const colors = { 1: "#EF4444", 2: "#3B82F6", 3: "#10B981" } as const;
    const node: Node = {
      id,
      position: position ?? { x: 80 + Math.random() * 220, y: 80 + Math.random() * 220 },
      type: `strategy${tier}`,
      data: { label: labels[tier], color: colors[tier], audio_url: null, r2_key: null, parent_id: null },
    };
    setNodes((ns) => { const u = [...ns, node]; pushHistory(u, edges); return u; });
    setSaveStatus("unsaved");
    return id;
  }, [setNodes, edges, pushHistory]);

  // ⌘+Enter: 1:N スマートブランチ生成
  const addChildBranch = useCallback(() => {
    const parent = nodes.find((n) => n.selected && (n.type === "strategy1" || n.type === "strategy2"));
    if (!parent) return;

    const nextTier = parent.type === "strategy1" ? 2 : 3;
    const labels   = { 2: "代表心理を入力", 3: "実行策を入力" } as const;
    const colors   = { 2: "#3B82F6", 3: "#10B981" } as const;

    // 既存の子の数を数えて横にオフセット
    const siblingCount = edges.filter((e) => e.source === parent.id).length;
    const nodeWidth    = 220;
    const gap          = 20;
    const xOffset      = siblingCount * (nodeWidth + gap);

    const childId   = `node_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
    const childNode: Node = {
      id:       childId,
      position: { x: parent.position.x + xOffset, y: parent.position.y + 160 },
      type:     `strategy${nextTier}`,
      data:     { label: labels[nextTier as 2 | 3], color: colors[nextTier as 2 | 3], audio_url: null, r2_key: null, parent_id: parent.id },
    };
    const newEdge: Edge = {
      id:            `edge_${Date.now()}`,
      source:        parent.id,
      target:        childId,
      sourceHandle:  "right",
      targetHandle:  "left",
      type:          "labeled",
      label:         "If...",
    };

    setNodes((ns) => [...ns, childNode]);
    setEdges((es) => {
      const updated = [...es, newEdge];
      pushHistory([...nodes, childNode], updated);
      return updated;
    });
    setSaveStatus("unsaved");
  }, [nodes, edges, setNodes, setEdges, pushHistory]);

  // ----- Keyboard shortcuts -----
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      if (mod && e.key === "z" &&  e.shiftKey) { e.preventDefault(); redo(); }
      if (mod && (e.key === "k" || e.key === "K")) { e.preventDefault(); setShowCmd(true); }
      if (mod && e.key === "Enter") { e.preventDefault(); addChildBranch(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo, addChildBranch]);

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

  // ----- Auto-save -----
  const debouncedNodes = useDebounce(nodes, 2000);
  const debouncedEdges = useDebounce(edges, 2000);

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    if (saveStatus === "saved") return;
    setSaveStatus("saving");

    type AnyData = ScriptItemNodeData & TextNodeData & RecordingNodeData & SectionNodeData & StrategyNodeData & { r2_key?: string; audio_url?: string; script_item_id?: string; parent_id?: string | null };
    const payload = {
      nodes: debouncedNodes.map((n) => {
        const d = n.data as AnyData;
        return {
          id: n.id,
          node_type:      n.type === "scriptItem" ? "script_item" : (n.type ?? "text"),
          title:          d.label ?? "",
          label:          d.label ?? "",
          content:        d.content ?? null,
          audio_url:      d.audio_url ?? null,
          r2_key:         d.r2_key ?? null,
          script_item_id: d.script_item_id ?? null,
          parent_id:      d.parent_id ?? null,
          color:          d.color ?? NODE_COLORS[n.type ?? "text"] ?? "#78716C",
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

    fetch(`/api/mind-maps/${mapId}/canvas`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      .then((r) => r.json())
      .then((j: { success: boolean }) => setSaveStatus(j.success ? "saved" : "unsaved"))
      .catch(() => setSaveStatus("unsaved"));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedNodes, debouncedEdges]);

  // ----- Commands -----
  const commands: Command[] = useMemo(() => [
    { id: "add-text",      label: "テキストノードを追加",       icon: <FileText className="w-4 h-4" />,      group: "ノード追加", action: () => addNode("text") },
    { id: "add-script",    label: "スクリプトノードを追加",     icon: <Plus className="w-4 h-4" />,          group: "ノード追加", action: () => addNode("script_item", { label: "スクリプト" }) },
    { id: "add-recording", label: "録音ノードを追加",           icon: <Mic className="w-4 h-4" />,           group: "ノード追加", action: () => addNode("recording", { label: "録音メモ" }) },
    { id: "add-s1",        label: "代表アウトノードを追加",     icon: <MessageSquare className="w-4 h-4" />, group: "戦略ツリー", action: () => addStrategyNode(1) },
    { id: "add-s2",        label: "代表心理ノードを追加",       icon: <Lightbulb className="w-4 h-4" />,     group: "戦略ツリー", action: () => addStrategyNode(2) },
    { id: "add-s3",        label: "実行ノードを追加",           icon: <Target className="w-4 h-4" />,        group: "戦略ツリー", action: () => addStrategyNode(3) },
    { id: "branch",        label: "子ブランチを生成 (⌘↩)",     icon: <Target className="w-4 h-4" />,        group: "戦略ツリー", shortcut: "⌘↩", action: addChildBranch },
    { id: "open-scripts",  label: "スクリプトパネルを開く",     icon: <FileText className="w-4 h-4" />,      group: "パネル",     action: () => setShowPanel(true) },
    { id: "outline",       label: "アウトライン表示",           icon: <FileText className="w-4 h-4" />,      group: "表示",       action: () => setViewMode("outline") },
    { id: "undo",          label: "元に戻す",                   icon: <Undo2 className="w-4 h-4" />,         group: "編集",       shortcut: "⌘Z",  action: undo },
    { id: "redo",          label: "やり直す",                   icon: <Redo2 className="w-4 h-4" />,         group: "編集",       shortcut: "⌘⇧Z", action: redo },
    { id: "fit-view",      label: "全体を表示",                 icon: <LayoutGrid className="w-4 h-4" />,    group: "表示",       action: () => fitView({ duration: 300 }) },
  ], [addNode, addStrategyNode, addChildBranch, undo, redo, fitView]);

  const EDGE_PATH_LABELS: Record<EdgePathType, string> = {
    smoothstep: "曲線",
    bezier:     "ベジェ",
    straight:   "直線",
  };

  return (
    <div className="flex h-full w-full relative">
      <div className="flex-1">
        {viewMode === "outline" ? (
          <OutlineView nodes={nodes} edges={edges} onBack={() => setViewMode("map")} />
        ) : (
          <ReactFlow
            nodes={nodesWithCallbacks}
            edges={edgesWithCallbacks}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={onConnect}
            isValidConnection={isValidConnection}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            deleteKeyCode={["Delete", "Backspace"]}
            className="bg-[#F7F6F4]"
          >
            <Controls className="border border-stone-200 shadow-sm rounded-lg overflow-hidden" />
            <MiniMap nodeStrokeWidth={3} zoomable pannable className="border border-stone-200 rounded-lg shadow-sm" />
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#D6D3D1" />

            {/* ツールバー */}
            <Panel position="top-left">
              <div className="flex items-center gap-1.5 bg-white border border-stone-200 rounded-xl px-3 py-2 shadow-sm flex-wrap text-stone-700">
                {/* ノード追加 */}
                <button onClick={() => addNode("text")}
                  className="px-2 py-1 text-[11px] bg-stone-100 hover:bg-stone-200 rounded-lg text-stone-700 inline-flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" /> テキスト
                </button>
                <button onClick={() => addNode("recording", { label: "録音メモ" })}
                  className="px-2 py-1 text-[11px] bg-red-50 hover:bg-red-100 rounded-lg text-red-700 inline-flex items-center gap-1">
                  <Mic className="w-3.5 h-3.5" /> 録音
                </button>

                <div className="w-px h-4 bg-stone-200 mx-0.5" />

                {/* 戦略ツリー */}
                <button onClick={() => addStrategyNode(1)}
                  className="px-2 py-1 text-[11px] bg-red-50 hover:bg-red-100 rounded-lg text-red-700 inline-flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5" /> 代表アウト
                </button>
                <button onClick={() => addStrategyNode(2)}
                  className="px-2 py-1 text-[11px] bg-blue-50 hover:bg-blue-100 rounded-lg text-blue-700 inline-flex items-center gap-1">
                  <Lightbulb className="w-3.5 h-3.5" /> 代表心理
                </button>
                <button onClick={() => addStrategyNode(3)}
                  className="px-2 py-1 text-[11px] bg-emerald-50 hover:bg-emerald-100 rounded-lg text-emerald-700 inline-flex items-center gap-1">
                  <Target className="w-3.5 h-3.5" /> 実行
                </button>

                <div className="w-px h-4 bg-stone-200 mx-0.5" />

                <button onClick={() => setShowPanel((v) => !v)}
                  className={`px-2 py-1 text-[11px] rounded-lg font-medium ${showPanel ? "bg-orange-600 text-white" : "bg-stone-100 text-stone-700 hover:bg-stone-200"}`}>
                  スクリプト
                </button>
                <button onClick={() => setViewMode("outline")}
                  className="px-2 py-1 text-[11px] bg-stone-100 hover:bg-stone-200 rounded-lg text-stone-700 inline-flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" /> アウトライン
                </button>

                <div className="w-px h-4 bg-stone-200 mx-0.5" />

                {/* エッジスタイル */}
                <div className="inline-flex rounded-lg border border-stone-200 overflow-hidden text-[10px]">
                  {(["smoothstep", "bezier", "straight"] as EdgePathType[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setEdgePathType(t)}
                      className={`px-2 py-1 ${edgePathType === t ? "bg-orange-600 text-white" : "bg-white text-stone-600 hover:bg-stone-100"}`}
                    >
                      {EDGE_PATH_LABELS[t]}
                    </button>
                  ))}
                </div>

                <div className="w-px h-4 bg-stone-200 mx-0.5" />

                <button onClick={undo} className="px-2 py-1 text-[11px] bg-stone-100 hover:bg-stone-200 rounded-lg text-stone-600" title="⌘Z">
                  <Undo2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={redo} className="px-2 py-1 text-[11px] bg-stone-100 hover:bg-stone-200 rounded-lg text-stone-600" title="⌘⇧Z">
                  <Redo2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setShowCmd(true)} className="px-2 py-1 text-[11px] bg-stone-800 text-white rounded-lg font-medium hover:bg-stone-700" title="⌘K">
                  ⌘K
                </button>
                <span className="ml-1 text-[10px] text-stone-400">
                  {saveStatus === "saving" ? "保存中..." : saveStatus === "saved" ? "保存済み" : "未保存"}
                </span>
              </div>
            </Panel>

            {/* ヒント */}
            <Panel position="bottom-center">
              <div className="text-[10px] text-stone-400 bg-white/80 px-3 py-1 rounded-full border border-stone-200 shadow-sm">
                ノード右端→隣ノード左端でLR接続 / エッジをダブルクリックでラベル編集 / 戦略ノード選択中 ⌘↩ で次段を多分岐生成
              </div>
            </Panel>
          </ReactFlow>
        )}
      </div>

      {showPanel && <ScriptItemPanel onAdd={handleScriptItemAdd} onClose={() => setShowPanel(false)} />}
      {showCmd   && <CommandPalette commands={commands} onClose={() => setShowCmd(false)} />}
      <ShortcutHelp />
    </div>
  );
}

function OutlineView({ nodes, edges, onBack }: { nodes: Node[]; edges: Edge[]; onBack: () => void }) {
  const { lines } = useMemo(() => buildOutlineLines(nodes, edges), [nodes, edges]);
  const text = lines.join("\n");

  return (
    <div className="h-full w-full bg-[#F7F6F4] text-stone-800 p-6 overflow-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 font-medium shadow-sm transition-colors"
          >
            <LayoutGrid className="w-3.5 h-3.5" /> マップに戻る
          </button>
          <span className="text-xs text-stone-400">アウトライン表示</span>
        </div>
        <button
          className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white border border-stone-200 hover:bg-stone-50 text-stone-600 shadow-sm"
          onClick={async () => { await navigator.clipboard.writeText(text); }}
        >
          <Clipboard className="w-3.5 h-3.5" /> コピー
        </button>
      </div>
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-4">
        <pre className="text-[13px] leading-7 whitespace-pre-wrap text-stone-700 font-mono">
          {text || "- （ノードがありません）"}
        </pre>
      </div>
    </div>
  );
}

interface Props { mapId: string; initialNodes: DbNode[]; initialEdges: DbEdge[]; }
export default function MindMapCanvas(props: Props) {
  return <ReactFlowProvider><Canvas {...props} /></ReactFlowProvider>;
}
