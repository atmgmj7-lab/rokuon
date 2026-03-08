"use client";
import { NodeProps, NodeResizer } from "reactflow";
import { useState } from "react";
import NodeVoiceNote from "./NodeVoiceNote";

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
  const [editing, setEditing] = useState(false);
  const [text,    setText]    = useState(data.label);

  const color       = data.color       ?? "#D97706";
  const bgColor     = data.bgColor     ?? "#FEFCE8";
  const borderWidth = data.borderWidth ?? 1;
  const shape       = data.nodeShape   ?? "rounded";
  const fontSize    = data.fontSize    ?? 12;
  const fontColor   = data.fontColor   ?? "#374151";

  const borderRadius = shape === "rect" ? 0 : 12;
  const isBubble     = shape === "bubble";

  const commit = (t = text) => {
    setEditing(false);
    data.onLabelChange?.(id, t);
  };

  return (
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
            onKeyDown={(e) => { if (e.key === "Escape") { setEditing(false); } }}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              flex: 1, minHeight: 32, resize: "none", background: "transparent",
              fontSize, color: fontColor, outline: "none", border: "none",
              fontFamily: "inherit", lineHeight: 1.6,
            }}
            className="nodrag w-full"
          />
        ) : (
          <p
            className="nodrag whitespace-pre-wrap"
            style={{ flex: 1, fontSize, color: fontColor, lineHeight: 1.6, cursor: "text", minHeight: 20 }}
            onDoubleClick={() => setEditing(true)}
          >
            {text || (
              <span style={{ color: "#9CA3AF", fontStyle: "italic", fontSize: 11 }}>
                {selected ? "ダブルクリックで入力…" : ""}
              </span>
            )}
          </p>
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
          <div style={{
            position: "absolute", bottom: -(borderWidth + 11), left: 20,
            borderLeft: "10px solid transparent", borderRight: "10px solid transparent",
            borderTop: `12px solid ${color}`,
            width: 0, height: 0,
          }} />
          <div style={{
            position: "absolute", bottom: -(borderWidth + 8), left: 22,
            borderLeft: "8px solid transparent", borderRight: "8px solid transparent",
            borderTop: `9px solid ${bgColor}`,
            width: 0, height: 0,
          }} />
        </>
      )}
    </div>
  );
}
