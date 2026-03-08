"use client";
import { Handle, Position, NodeProps, NodeResizer } from "reactflow";
import { useState } from "react";
import NodeVoiceNote from "./NodeVoiceNote";
import { ChevronDown, ChevronRight, FileText } from "lucide-react";

const PALETTE   = ["#78716C","#C2410C","#2563EB","#16A34A","#9333EA","#D97706","#BE185D","#0E7490","#374151","#B45309"];
const BG_COLORS = ["#FFFFFF","#F7F6F4","#FFF7ED","#EFF6FF","#F0FDF4","#FAF5FF","#FEFCE8","#FFF1F2","#F0F9FF","#ECFDF5"];

interface ContentData { body: string; }

function parseContent(raw: string | null | undefined): ContentData {
  if (!raw) return { body: "" };
  try {
    const p = JSON.parse(raw) as unknown;
    if (typeof p === "object" && p !== null && "body" in p) return { body: (p as ContentData).body ?? "" };
  } catch {}
  return { body: raw };
}

export interface ScriptItemNodeData {
  label: string;
  content?: string;
  color?: string;
  bgColor?: string;
  borderWidth?: number;
  script_item_id?: string;
  audio_url?: string | null;
  r2_key?: string | null;
  onRecordingSaved?:    (id: string, audioUrl: string, r2Key: string) => void;
  onAudioDeleted?:      (id: string) => void;
  onLabelChange?:       (id: string, label: string) => void;
  onColorChange?:       (id: string, color: string) => void;
  onBgColorChange?:     (id: string, color: string) => void;
  onBorderWidthChange?: (id: string, width: number) => void;
  onContentChange?:     (id: string, content: string) => void;
  onScriptSync?:        (scriptItemId: string, title: string, content: string) => void;
}

export default function ScriptItemNode({ id, data, selected }: NodeProps<ScriptItemNodeData>) {
  const parsed = parseContent(data.content);
  const [collapsed,  setCollapsed]  = useState(false);
  const [editLabel,  setEditLabel]  = useState(false);
  const [editBody,   setEditBody]   = useState(false);
  const [label,      setLabel]      = useState(data.label);
  const [body,       setBody]       = useState(parsed.body);

  const color       = data.color       ?? "#C2410C";
  const bgColor     = data.bgColor     ?? "#FFFFFF";
  const borderWidth = data.borderWidth ?? 2;

  const commitLabel = () => {
    setEditLabel(false);
    const next = label.trim() || "無題";
    setLabel(next);
    data.onLabelChange?.(id, next);
    if (data.script_item_id) data.onScriptSync?.(data.script_item_id, next, body);
  };

  const commitBody = (b = body) => {
    setEditBody(false);
    data.onContentChange?.(id, JSON.stringify({ body: b }));
    if (data.script_item_id) data.onScriptSync?.(data.script_item_id, label, b);
  };

  return (
    <div
      style={{
        width: "100%", height: "100%",
        display: "flex", flexDirection: "column",
        border: `${borderWidth}px solid ${color}`,
        borderRadius: 10, overflow: "hidden",
        backgroundColor: bgColor,
        boxShadow: selected
          ? "0 4px 16px rgba(0,0,0,0.14)"
          : "0 1px 5px rgba(0,0,0,0.07)",
        minWidth: 200, minHeight: 60,
        transition: "box-shadow 0.15s",
      }}
    >
      <NodeResizer
        minWidth={180} minHeight={56}
        isVisible={selected}
        lineStyle={{ borderColor: color }}
        handleStyle={{ backgroundColor: color, width: 8, height: 8, borderRadius: 2 }}
      />
      <Handle type="target" position={Position.Left}  id="left"  style={{ background: color, width: 10, height: 10, border: "2px solid white" }} />
      <Handle type="source" position={Position.Right} id="right" style={{ background: color, width: 10, height: 10, border: "2px solid white" }} />

      {/* Header */}
      <div
        style={{ backgroundColor: color, flexShrink: 0 }}
        className="flex items-center gap-1.5 px-3 py-2"
      >
        <FileText className="w-3.5 h-3.5 text-white/80 shrink-0" />
        {editLabel ? (
          <input
            autoFocus value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={commitLabel}
            onKeyDown={(e) => { if (e.key === "Enter") commitLabel(); if (e.key === "Escape") setEditLabel(false); }}
            onMouseDown={(e) => e.stopPropagation()}
            className="nodrag flex-1 bg-white/20 rounded px-1.5 py-0.5 text-[12px] text-white font-semibold outline-none placeholder-white/60 w-full"
          />
        ) : (
          <span
            className="nodrag flex-1 text-white font-semibold text-[12px] leading-tight truncate cursor-text select-none"
            onClick={() => { if (selected) setEditLabel(true); }}
            onDoubleClick={() => setEditLabel(true)}
          >{label}</span>
        )}
        <button
          onMouseDown={(e) => { e.stopPropagation(); setCollapsed((v) => !v); }}
          className="text-white/70 hover:text-white shrink-0"
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {!collapsed && (
        <>
          {/* Body */}
          <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }} className="px-3 pt-2 pb-1">
            {editBody ? (
              <textarea
                autoFocus value={body}
                onChange={(e) => setBody(e.target.value)}
                onBlur={() => commitBody()}
                onMouseDown={(e) => e.stopPropagation()}
                style={{ flex: 1, minHeight: 48, resize: "none", background: "transparent" }}
                className="nodrag w-full text-[12px] text-stone-700 outline-none leading-relaxed"
              />
            ) : (
              <p
                className="nodrag text-[12px] text-stone-700 leading-relaxed whitespace-pre-wrap"
                style={{ flex: 1, cursor: selected ? "text" : "default", minHeight: 32 }}
                onClick={() => { if (selected) setEditBody(true); }}
                onDoubleClick={() => setEditBody(true)}
              >
                {body || (
                  <span className="text-stone-300 italic">
                    {selected ? "クリックして入力…" : "ダブルクリックで選択"}
                  </span>
                )}
              </p>
            )}
          </div>

          {/* Audio */}
          <div className="px-3 pb-2">
            <NodeVoiceNote
              nodeId={id}
              audioUrl={data.audio_url ?? null}
              r2Key={data.r2_key ?? null}
              onSaved={(nid, url, r2) => data.onRecordingSaved?.(nid, url, r2)}
              onDeleted={(nid) => data.onAudioDeleted?.(nid)}
            />
          </div>

          {/* Style controls — INSIDE node to prevent deselection on click */}
          {selected && (
            <div
              className="px-3 pb-2 flex flex-wrap gap-1 items-center border-t border-black/5"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <span className="text-[8px] text-stone-400 font-medium shrink-0">枠色</span>
              {PALETTE.map((c) => (
                <button key={c}
                  onMouseDown={(e) => { e.stopPropagation(); data.onColorChange?.(id, c); }}
                  style={{ backgroundColor: c, border: color === c ? "2px solid #374151" : "2px solid transparent" }}
                  className="w-4 h-4 rounded-full hover:scale-110 transition-transform"
                />
              ))}
              <span className="text-[8px] text-stone-400 font-medium ml-1 shrink-0">背景</span>
              {BG_COLORS.map((c) => (
                <button key={c}
                  onMouseDown={(e) => { e.stopPropagation(); data.onBgColorChange?.(id, c); }}
                  style={{ backgroundColor: c, border: bgColor === c ? "2px solid #374151" : "1px solid #D6D3D1" }}
                  className="w-4 h-4 rounded hover:scale-110 transition-transform"
                />
              ))}
              <span className="text-[8px] text-stone-400 font-medium ml-1 shrink-0">枠幅</span>
              {([1, 2, 3] as const).map((w) => (
                <button key={w}
                  onMouseDown={(e) => { e.stopPropagation(); data.onBorderWidthChange?.(id, w); }}
                  className={`text-[8px] px-1.5 rounded leading-tight ${borderWidth === w ? "bg-stone-700 text-white" : "bg-stone-100 text-stone-500"}`}
                >
                  {w === 1 ? "細" : w === 2 ? "中" : "太"}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
