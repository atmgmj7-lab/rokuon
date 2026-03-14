"use client";
import { Handle, Position, NodeProps, NodeResizer } from "reactflow";
import { useState } from "react";
import { createPortal } from "react-dom";
import NodeVoiceNote from "./NodeVoiceNote";
import NodeRichTextEditor from "./NodeRichTextEditor";
import NodeRichTextView from "./NodeRichTextView";
import { Maximize2, Target, X } from "lucide-react";

interface ContentData { body: string; }

function parseContent(raw: string | null | undefined): ContentData {
  if (!raw) return { body: "" };
  try {
    const p = JSON.parse(raw) as unknown;
    if (typeof p === "object" && p !== null && "body" in p) return { body: (p as ContentData).body ?? "" };
  } catch {}
  return { body: raw };
}

export interface GoalNodeData {
  label: string;
  content?: string;
  color?: string;
  bgColor?: string;
  borderWidth?: number;
  fontSize?: number;
  fontColor?: string;
  audio_url?: string | null;
  r2_key?: string | null;
  onRecordingSaved?: (id: string, audioUrl: string, r2Key: string) => void;
  onAudioDeleted?:   (id: string) => void;
  onLabelChange?:    (id: string, label: string) => void;
  onContentChange?:  (id: string, content: string) => void;
}

export default function GoalNode({ id, data, selected }: NodeProps<GoalNodeData>) {
  const parsed = parseContent(data.content);
  const [editTitle, setEditTitle] = useState(false);
  const [editBody,  setEditBody]  = useState(false);
  const [title,     setTitle]     = useState(data.label);
  const [body,      setBody]      = useState(parsed.body);
  const [showPopup, setShowPopup] = useState(false);

  const color       = data.color       ?? "#0EA5E9";
  const bgColor     = data.bgColor     ?? "#F0F9FF";
  const borderWidth = data.borderWidth ?? 2;
  const fontSize    = data.fontSize    ?? 12;
  const fontColor   = data.fontColor   ?? "#0C4A6E";

  const plainBody = body.replace(/<[^>]+>/g, "").trim();
  const hasContent = plainBody.length > 0;

  const commitTitle = () => {
    setEditTitle(false);
    const next = title.trim() || "ゴール";
    setTitle(next);
    data.onLabelChange?.(id, next);
  };

  const commitBody = (b = body) => {
    setEditBody(false);
    data.onContentChange?.(id, JSON.stringify({ body: b }));
  };

  return (
    <>
      <div
        style={{
          width: "100%", height: "100%",
          display: "flex", flexDirection: "column",
          border: `${borderWidth}px solid ${color}`,
          borderRadius: 12, overflow: "hidden",
          backgroundColor: bgColor,
          boxShadow: selected
            ? `0 0 0 3px ${color}40, 0 4px 16px rgba(0,0,0,0.14)`
            : `0 0 0 1px ${color}20, 0 1px 5px rgba(0,0,0,0.07)`,
          minWidth: 180, minHeight: 60,
          transition: "box-shadow 0.15s",
        }}
      >
        <NodeResizer
          minWidth={160} minHeight={56}
          isVisible={selected}
          lineStyle={{ borderColor: color }}
          handleStyle={{ backgroundColor: color, width: 8, height: 8, borderRadius: 2 }}
        />
        <Handle type="target" position={Position.Left}  id="left"  style={{ background: color, width: 10, height: 10, border: "2px solid white" }} />
        <Handle type="source" position={Position.Right} id="right" style={{ background: color, width: 10, height: 10, border: "2px solid white" }} />

        {/* Header */}
        <div style={{ backgroundColor: color, flexShrink: 0 }} className="flex items-center gap-1.5 px-3 py-2">
          <Target className="w-3.5 h-3.5 text-white shrink-0" />
          <span className="text-[8px] font-bold text-white/70 bg-white/20 px-1.5 py-0.5 rounded shrink-0 tracking-wider">GOAL</span>
          {editTitle ? (
            <input
              autoFocus value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => { if (e.key === "Enter") commitTitle(); if (e.key === "Escape") setEditTitle(false); }}
              onMouseDown={(e) => e.stopPropagation()}
              className="nodrag flex-1 bg-white/20 rounded px-1.5 py-0.5 text-[12px] text-white font-semibold outline-none w-full"
            />
          ) : (
            <span
              className="nodrag flex-1 text-white font-semibold text-[12px] leading-tight truncate select-none"
              onDoubleClick={() => setEditTitle(true)}
            >{title}</span>
          )}
          {hasContent && (
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); setShowPopup(true); }}
              className="nodrag shrink-0 inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-white/20 hover:bg-white/30 text-white text-[10px] font-medium transition-colors"
              title="全文を見る"
            >
              <Maximize2 className="w-2.5 h-2.5" /> 全文
            </button>
          )}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }} className="px-3 pt-2 pb-1">
          {editBody ? (
            <NodeRichTextEditor
              value={body}
              onChange={(html) => setBody(html)}
              onBlur={(html) => commitBody(html ?? body)}
              placeholder="ダブルクリックで内容を入力…"
              defaultFontSize={fontSize}
              defaultFontColor={fontColor}
              minHeight={48}
            />
          ) : (
            <div
              style={{ flex: 1 }}
              className="nodrag leading-relaxed whitespace-pre-wrap cursor-text"
              onDoubleClick={() => setEditBody(true)}
            >
              <NodeRichTextView
                html={body}
                defaultFontSize={fontSize}
                defaultFontColor={fontColor}
              />
              {!hasContent && (
                <span className="text-stone-300 italic text-[11px]">ダブルクリックで内容を入力…</span>
              )}
            </div>
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
      </div>

      {/* Full-text popup */}
      {showPopup && typeof document !== "undefined" && createPortal(
        <div
          style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}
          className="bg-black/40 backdrop-blur-sm"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={() => setShowPopup(false)}
        >
          <div
            style={{ background: "white", borderRadius: 16, padding: "24px 28px", maxWidth: 520, width: "90vw", maxHeight: "80vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.25)", border: `2px solid ${color}` }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-3 gap-3">
              <div className="flex items-center gap-2">
                <Target style={{ color, width: 14, height: 14, flexShrink: 0 }} />
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: color + "20", color }}>GOAL</span>
                <h3 className="font-bold text-stone-800 text-sm">{title}</h3>
              </div>
              <button onClick={() => setShowPopup(false)} className="text-stone-400 hover:text-stone-600 shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div style={{ fontSize: fontSize + 1, color: fontColor }} className="leading-relaxed whitespace-pre-wrap">
              <NodeRichTextView html={body} defaultFontSize={fontSize + 1} defaultFontColor={fontColor} />
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
