"use client";
import { Handle, Position, NodeProps, NodeResizer } from "reactflow";
import { useState, useRef, useEffect } from "react";
import ColorPicker from "../ColorPicker";

export interface TextNodeData {
  label: string;
  content?: string;
  color?: string;
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
  const [text, setText]           = useState(data.content ?? data.label);
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
        <span>✏️ テキスト</span>
        {selected && (
          <>
            <button
              onMouseDown={(e) => { e.stopPropagation(); setShowColors((v) => !v); }}
              className="ml-auto opacity-70 hover:opacity-100"
              title="色を変更"
            >🎨</button>
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
                🖊 HL
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
    </div>
  );
}
