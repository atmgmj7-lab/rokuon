"use client";
import { Handle, Position, NodeProps, NodeResizer } from "reactflow";
import { useState, useRef, useEffect } from "react";
import ColorPicker from "../ColorPicker";
import NodeVoiceNote from "./NodeVoiceNote";
import { Highlighter, Palette, Type } from "lucide-react";

export interface TextNodeData {
  label: string;
  content?: string;
  color?: string;
  audio_url?: string | null;
  r2_key?: string | null;
  onRecordingSaved?: (id: string, audioUrl: string, r2Key: string) => void;
  onAudioDeleted?:   (id: string) => void;
  onLabelChange?: (id: string, label: string) => void;
  onContentChange?: (id: string, content: string) => void;
  onColorChange?:   (id: string, color: string)   => void;
}

/** ==highlighted== → <mark> でレンダリング */
function renderHighlighted(text: string) {
  const parts = text.split(/(==.+?==)/g);
  return parts.map((part, i) =>
    part.startsWith("==") && part.endsWith("==") ? (
      <mark key={i} className="bg-yellow-200 rounded px-0.5">{part.slice(2, -2)}</mark>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export default function TextNode({ id, data, selected }: NodeProps<TextNodeData>) {
  const [editing, setEditing]     = useState(false);
  const [text, setText]           = useState(data.content ?? "");
  const [titleEditing, setTitleEditing] = useState(false);
  const [title, setTitle]         = useState(data.label);
  const [showColors, setShowColors] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const color = data.color ?? "#6B7280";

  useEffect(() => {
    if (editing) textareaRef.current?.focus();
  }, [editing]);

  const handleBlur = () => {
    setEditing(false);
    data.onContentChange?.(id, text);
  };

  const handleTitleBlur = () => {
    setTitleEditing(false);
    const next = title.trim() || "無題";
    setTitle(next);
    data.onLabelChange?.(id, next);
  };

  /** 選択テキストを == で囲む */
  const addHighlight = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e } = ta;
    if (s === e) return;
    const newText = text.slice(0, s) + "==" + text.slice(s, e) + "==" + text.slice(e);
    setText(newText);
  };

  return (
    <div
      className={`rounded-xl border bg-white shadow-sm transition-shadow ${selected ? "shadow-lg" : ""}`}
      style={{ borderColor: color, minWidth: 160, minHeight: 60 }}
    >
      <NodeResizer
        minWidth={120} minHeight={50}
        isVisible={selected}
        lineStyle={{ borderColor: color }}
        handleStyle={{ backgroundColor: color, width: 8, height: 8 }}
      />

      <Handle type="target" position={Position.Top}    style={{ background: color }} />
      <Handle type="source" position={Position.Bottom} style={{ background: color }} />
      <Handle type="target" position={Position.Left}   id="left"  style={{ background: color }} />
      <Handle type="source" position={Position.Right}  id="right" style={{ background: color }} />

      {/* ヘッダー */}
      <div
        className="px-2 py-1 rounded-t-xl text-white text-[9px] font-bold flex items-center gap-1"
        style={{ backgroundColor: color }}
      >
        <Type className="w-3.5 h-3.5 opacity-90" />
        {titleEditing ? (
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={(e) => { if (e.key === "Enter") handleTitleBlur(); }}
            className="flex-1 bg-white/15 rounded px-1 py-0.5 text-[10px] outline-none"
          />
        ) : (
          <span className="flex-1 truncate" onDoubleClick={() => setTitleEditing(true)} title="ダブルクリックでタイトル編集">
            {title}
          </span>
        )}
        {selected && (
          <>
            <button
              onMouseDown={(e) => { e.stopPropagation(); setShowColors((v) => !v); }}
              className="ml-auto opacity-70 hover:opacity-100"
              title="色を変更"
            >
              <Palette className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>

      {/* カラーパレット */}
      {showColors && selected && (
        <div className="absolute top-full left-0 mt-1 z-50">
          <ColorPicker
            current={color}
            onChange={(c) => { data.onColorChange?.(id, c); setShowColors(false); }}
          />
        </div>
      )}

      {/* 本文 */}
      <div
        className="px-3 py-2 cursor-text min-h-[40px]"
        onDoubleClick={() => setEditing(true)}
      >
        {editing ? (
          <div>
            {/* ハイライトボタン */}
            <div className="flex gap-1 mb-1">
              <button
                onMouseDown={(e) => { e.preventDefault(); addHighlight(); }}
                className="text-[9px] px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
                title="選択範囲をハイライト (==text==)"
              >
                <span className="inline-flex items-center gap-1">
                  <Highlighter className="w-3 h-3" /> HL
                </span>
              </button>
            </div>
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onBlur={handleBlur}
              className="w-full text-[12px] text-stone-700 resize-none border-none outline-none bg-transparent leading-relaxed"
              style={{ minHeight: 60 }}
            />
          </div>
        ) : (
          <p className="text-[12px] text-stone-700 leading-relaxed whitespace-pre-wrap">
            {text ? renderHighlighted(text) : (
              <span className="text-stone-300 italic">ダブルクリックで編集</span>
            )}
          </p>
        )}
      </div>

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
  );
}
