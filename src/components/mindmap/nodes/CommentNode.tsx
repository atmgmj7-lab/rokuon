"use client";
import { NodeProps, NodeResizer } from "reactflow";
import { useState } from "react";
import { createPortal } from "react-dom";
import NodeVoiceNote from "./NodeVoiceNote";
import NodeRichTextEditor from "./NodeRichTextEditor";
import NodeRichTextView from "./NodeRichTextView";
import NodeBodyWithEllipsis from "./NodeBodyWithEllipsis";
import { Maximize2, MessageSquare, X } from "lucide-react";

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
  const plainText    = text.replace(/<[^>]+>/g, "").trim();
  const hasContent   = plainText.length > 0;

  const commit = (t = text) => {
    setEditing(false);
    if (t !== undefined) setText(t);
    data.onLabelChange?.(id, t ?? text);
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
            <NodeRichTextEditor
              value={text}
              onChange={(html) => setText(html)}
              onBlur={(html) => commit(html ?? text)}
              placeholder="ダブルクリックで入力…"
              defaultFontSize={fontSize}
              defaultFontColor={fontColor}
              minHeight={32}
            />
          ) : (
            <NodeBodyWithEllipsis
              style={{ lineHeight: 1.6, minHeight: 20 }}
              className="nodrag whitespace-pre-wrap cursor-text"
              onDoubleClick={() => setEditing(true)}
            >
              <NodeRichTextView
                html={text}
                defaultFontSize={fontSize}
                defaultFontColor={fontColor}
              />
              {!hasContent && selected && (
                <span style={{ color: "#9CA3AF", fontStyle: "italic", fontSize: 11 }}>
                  ダブルクリックで入力…
                </span>
              )}
            </NodeBodyWithEllipsis>
          )}

          {/* 全文を見る + 録音（常時表示・サイズ変更で隠れない） */}
          <div className="flex items-center gap-2 flex-wrap shrink-0 pt-1">
            {hasContent && (
              <button
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); setShowPopup(true); }}
                className="nodrag inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-amber-100 hover:bg-amber-200 text-amber-800 text-[10px] font-medium transition-colors"
                title="全文を見る"
              >
                <Maximize2 className="w-2.5 h-2.5" /> 全文を見る
              </button>
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
      </div>

      {/* Full-text popup */}
      {showPopup && typeof document !== "undefined"
        ? createPortal(
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
                <div style={{ fontSize: fontSize + 1, color: fontColor }} className="leading-relaxed whitespace-pre-wrap">
                  <NodeRichTextView html={text} defaultFontSize={fontSize + 1} defaultFontColor={fontColor} />
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
