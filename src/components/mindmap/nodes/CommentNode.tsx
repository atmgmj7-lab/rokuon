"use client";
import { NodeProps, NodeResizer } from "reactflow";
import { useState } from "react";
import { createPortal } from "react-dom";
import NodeVoiceNote from "./NodeVoiceNote";
import { Maximize2, MessageSquare, X } from "lucide-react";

const TRUNCATE = 100;

export interface CommentNodeData {
  label: string;
  color?: string;
  bgColor?: string;
  borderWidth?: number;
  nodeShape?: "rect" | "rounded" | "bubble";
  fontSize?: number;
  fontColor?: string;
  audio_url?: string | null;
  r2_key?: string | null;
  onLabelChange?:    (id: string, label: string) => void;
  onRecordingSaved?: (id: string, audioUrl: string, r2Key: string) => void;
  onAudioDeleted?:   (id: string) => void;
}

export default function CommentNode({ id, data, selected }: NodeProps<CommentNodeData>) {
  const [editing,   setEditing]   = useState(false);
  const [text,      setText]      = useState(data.label);
  const [showPopup, setShowPopup] = useState(false);

  const color       = data.color       ?? "#D97706";
  const bgColor     = data.bgColor     ?? "#FEFCE8";
  const borderWidth = data.borderWidth ?? 1;
  const shape       = data.nodeShape   ?? "rounded";
  const fontSize    = data.fontSize    ?? 12;
  const fontColor   = data.fontColor   ?? "#374151";

  const borderRadius = shape === "rect" ? 0 : 12;
  const isBubble     = shape === "bubble";
  const isTruncated  = text.length > TRUNCATE;
  const displayText  = isTruncated ? text.slice(0, TRUNCATE) + "…" : text;

  const commit = (t = text) => {
    setEditing(false);
    data.onLabelChange?.(id, t);
  };

  return (
    <>
      <div style={{ width: "100%", height: "100%", position: "relative" }}>
        <NodeResizer
          minWidth={100} minHeight={36}
          isVisible={selected}
          lineStyle={{ borderColor: color }}
          handleStyle={{ backgroundColor: color, width: 8, height: 8, borderRadius: 2 }}
        />

        {/* Main content */}
        <div
          style={{
            width: "100%", height: "100%",
            border: `${borderWidth}px solid ${color}`,
            borderRadius,
            backgroundColor: bgColor,
            padding: "8px 12px",
            display: "flex", flexDirection: "column", gap: 4,
            boxShadow: selected ? "0 4px 16px rgba(0,0,0,0.14)" : "0 1px 5px rgba(0,0,0,0.07)",
            transition: "box-shadow 0.15s",
            overflow: "hidden",
          }}
        >
          {editing ? (
            <textarea
              autoFocus value={text}
              onChange={(e) => setText(e.target.value)}
              onBlur={() => commit()}
              onKeyDown={(e) => { if (e.key === "Escape") setEditing(false); }}
              onMouseDown={(e) => e.stopPropagation()}
              style={{ flex: 1, minHeight: 32, resize: "none", background: "transparent", fontSize, color: fontColor, outline: "none", border: "none", fontFamily: "inherit", lineHeight: 1.6 }}
              className="nodrag w-full"
            />
          ) : (
            <div style={{ flex: 1 }}>
              <p
                className="nodrag whitespace-pre-wrap"
                style={{ fontSize, color: fontColor, lineHeight: 1.6, cursor: "text", minHeight: 20 }}
                onDoubleClick={() => setEditing(true)}
              >
                {displayText || (
                  <span style={{ color: "#9CA3AF", fontStyle: "italic", fontSize: 11 }}>
                    {selected ? "ダブルクリックで入力…" : ""}
                  </span>
                )}
              </p>
              {isTruncated && (
                <button
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); setShowPopup(true); }}
                  className="nodrag mt-1 inline-flex items-center gap-0.5 text-[10px] text-stone-400 hover:text-amber-500 transition-colors"
                >
                  <Maximize2 className="w-2.5 h-2.5" /> 全文を見る
                </button>
              )}
            </div>
          )}

          {selected && (
            <NodeVoiceNote
              nodeId={id}
              audioUrl={data.audio_url ?? null}
              r2Key={data.r2_key ?? null}
              onSaved={(nid, url, r2) => data.onRecordingSaved?.(nid, url, r2)}
              onDeleted={(nid) => data.onAudioDeleted?.(nid)}
            />
          )}
        </div>

        {/* Bubble tail */}
        {isBubble && (
          <>
            <div style={{ position: "absolute", bottom: -(borderWidth + 11), left: 20, borderLeft: "10px solid transparent", borderRight: "10px solid transparent", borderTop: `12px solid ${color}`, width: 0, height: 0 }} />
            <div style={{ position: "absolute", bottom: -(borderWidth + 8), left: 22, borderLeft: "8px solid transparent", borderRight: "8px solid transparent", borderTop: `9px solid ${bgColor}`, width: 0, height: 0 }} />
          </>
        )}
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
                <MessageSquare style={{ color, width: 14, height: 14, flexShrink: 0 }} />
                <h3 className="font-bold text-stone-600 text-sm">コメント</h3>
              </div>
              <button onClick={() => setShowPopup(false)} className="text-stone-400 hover:text-stone-600 shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p style={{ fontSize: fontSize + 1, color: fontColor }} className="leading-relaxed whitespace-pre-wrap">
              {text}
            </p>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
