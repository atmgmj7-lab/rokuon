"use client";
import { Handle, Position, NodeProps, NodeResizer } from "reactflow";
import { useState } from "react";
import ColorPicker from "../ColorPicker";
import NodeVoiceNote from "./NodeVoiceNote";
import { ChevronDown, ChevronRight, Palette, Type } from "lucide-react";

export interface TextNodeData {
  label: string;
  content?: string;
  color?: string;
  audio_url?: string | null;
  r2_key?: string | null;
  onRecordingSaved?: (id: string, audioUrl: string, r2Key: string) => void;
  onAudioDeleted?:   (id: string) => void;
  onLabelChange?:    (id: string, label: string) => void;
  onContentChange?:  (id: string, content: string) => void;
  onColorChange?:    (id: string, color: string)   => void;
}

export default function TextNode({ id, data, selected }: NodeProps<TextNodeData>) {
  const [collapsed,   setCollapsed]   = useState(false);
  const [editTitle,   setEditTitle]   = useState(false);
  const [editBody,    setEditBody]    = useState(false);
  const [title,       setTitle]       = useState(data.label);
  const [text,        setText]        = useState(data.content ?? "");
  const [showColors,  setShowColors]  = useState(false);
  const color = data.color ?? "#78716C";

  const commitTitle = () => {
    setEditTitle(false);
    const next = title.trim() || "無題";
    setTitle(next);
    data.onLabelChange?.(id, next);
  };

  const commitBody = () => {
    setEditBody(false);
    data.onContentChange?.(id, text);
  };

  return (
    <div
      className={`rounded-xl border bg-white shadow-sm transition-shadow ${selected ? "shadow-md" : ""}`}
      style={{ borderColor: color, minWidth: 160 }}
    >
      <NodeResizer
        minWidth={120} minHeight={44}
        isVisible={selected}
        lineStyle={{ borderColor: color }}
        handleStyle={{ backgroundColor: color, width: 8, height: 8 }}
      />

      {/* LR ハンドルのみ */}
      <Handle type="target" position={Position.Left}  id="left"  style={{ background: color, width: 10, height: 10 }} />
      <Handle type="source" position={Position.Right} id="right" style={{ background: color, width: 10, height: 10 }} />

      {/* ヘッダー */}
      <div
        className="px-2 py-1 rounded-t-xl text-white text-[9px] font-bold flex items-center gap-1"
        style={{ backgroundColor: color, borderRadius: collapsed ? "0.75rem" : undefined }}
      >
        <Type className="w-3.5 h-3.5 opacity-90 shrink-0" />
        {editTitle ? (
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => { if (e.key === "Enter") commitTitle(); if (e.key === "Escape") setEditTitle(false); }}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 bg-white/15 rounded px-1 py-0.5 text-[10px] outline-none"
          />
        ) : (
          <span
            className="nodrag flex-1 truncate cursor-text"
            onClick={() => { if (selected) setEditTitle(true); }}
            title={selected ? "クリックで編集" : undefined}
          >
            {title}
          </span>
        )}
        <div className="flex items-center gap-0.5 shrink-0">
          {selected && (
            <button
              onMouseDown={(e) => { e.stopPropagation(); setShowColors((v) => !v); }}
              className="opacity-70 hover:opacity-100"
              title="色を変更"
            >
              <Palette className="w-3 h-3" />
            </button>
          )}
          <button
            onMouseDown={(e) => { e.stopPropagation(); setCollapsed((v) => !v); }}
            className="opacity-70 hover:opacity-100"
            title={collapsed ? "展開" : "折りたたむ"}
          >
            {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* カラーパレット */}
      {showColors && selected && (
        <div className="absolute top-full left-0 mt-1 z-50">
          <ColorPicker current={color} onChange={(c) => { data.onColorChange?.(id, c); setShowColors(false); }} />
        </div>
      )}

      {/* 本文（折りたたみ時は非表示） */}
      {!collapsed && (
        <div className="px-3 py-2 space-y-1.5">
          {editBody ? (
            <textarea
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              onBlur={commitBody}
              onClick={(e) => e.stopPropagation()}
              className="nodrag w-full text-[12px] text-stone-700 resize-none border border-stone-200 rounded p-1 outline-none bg-stone-50 leading-relaxed"
              style={{ minHeight: 60 }}
            />
          ) : (
            <p
              className="nodrag text-[12px] text-stone-700 leading-relaxed whitespace-pre-wrap"
              onClick={() => { if (selected) setEditBody(true); }}
              style={{ cursor: selected ? "text" : "default", minHeight: 32 }}
            >
              {text || (
                selected
                  ? <span className="text-stone-300 italic">クリックして入力…</span>
                  : <span className="text-stone-300 italic">ダブルクリックで選択</span>
              )}
            </p>
          )}
          <NodeVoiceNote
            nodeId={id}
            audioUrl={data.audio_url ?? null}
            r2Key={data.r2_key ?? null}
            onSaved={(nid, url, r2) => data.onRecordingSaved?.(nid, url, r2)}
            onDeleted={(nid) => data.onAudioDeleted?.(nid)}
          />
        </div>
      )}
    </div>
  );
}
