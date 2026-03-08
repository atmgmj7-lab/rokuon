"use client";
import { Handle, Position, NodeProps, NodeResizer } from "reactflow";
import { useState } from "react";
import NodeVoiceNote from "./NodeVoiceNote";
import { ChevronDown, ChevronRight, FileText } from "lucide-react";

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
  fontSize?: number;
  fontColor?: string;
  script_item_id?: string;
  audio_url?: string | null;
  r2_key?: string | null;
  onRecordingSaved?: (id: string, audioUrl: string, r2Key: string) => void;
  onAudioDeleted?:   (id: string) => void;
  onLabelChange?:    (id: string, label: string) => void;
  onContentChange?:  (id: string, content: string) => void;
  onScriptSync?:     (scriptItemId: string, title: string, content: string) => void;
}

export default function ScriptItemNode({ id, data, selected }: NodeProps<ScriptItemNodeData>) {
  const parsed = parseContent(data.content);
  const [collapsed, setCollapsed] = useState(false);
  const [editLabel, setEditLabel] = useState(false);
  const [editBody,  setEditBody]  = useState(false);
  const [label,     setLabel]     = useState(data.label);
  const [body,      setBody]      = useState(parsed.body);

  const color       = data.color       ?? "#C2410C";
  const bgColor     = data.bgColor     ?? "#FFFFFF";
  const borderWidth = data.borderWidth ?? 2;
  const fontSize    = data.fontSize    ?? 12;
  const fontColor   = data.fontColor   ?? "#374151";

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
            className="nodrag flex-1 bg-white/20 rounded px-1.5 py-0.5 text-[12px] text-white font-semibold outline-none w-full"
          />
        ) : (
          <span
            className="nodrag flex-1 text-white font-semibold text-[12px] leading-tight truncate select-none"
            onDoubleClick={() => setEditLabel(true)}
          >{label}</span>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); setCollapsed((v) => !v); }}
          onMouseDown={(e) => e.stopPropagation()}
          className="text-white/70 hover:text-white shrink-0 p-1 -mr-1 rounded hover:bg-white/10"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
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
                style={{ flex: 1, minHeight: 48, resize: "none", background: "transparent", fontSize, color: fontColor }}
                className="nodrag w-full outline-none leading-relaxed"
              />
            ) : (
              <p
                className="nodrag leading-relaxed whitespace-pre-wrap"
                style={{ flex: 1, cursor: "text", minHeight: 32, fontSize, color: fontColor }}
                onDoubleClick={() => setEditBody(true)}
              >
                {body || (
                  <span className="text-stone-300 italic text-[11px]">ダブルクリックで入力…</span>
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
        </>
      )}
    </div>
  );
}
