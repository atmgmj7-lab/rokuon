"use client";
import { Handle, Position, NodeProps } from "reactflow";
import { useState, useRef, useEffect } from "react";

export interface TextNodeData {
  label: string;
  content?: string;
  color?: string;
  onContentChange?: (id: string, content: string) => void;
}

export default function TextNode({ id, data, selected }: NodeProps<TextNodeData>) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(data.content ?? data.label);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const color = data.color ?? "#6B7280";

  useEffect(() => {
    if (editing) textareaRef.current?.focus();
  }, [editing]);

  const handleBlur = () => {
    setEditing(false);
    data.onContentChange?.(id, text);
  };

  return (
    <div
      className={`rounded-xl border bg-white shadow-sm min-w-[160px] max-w-[260px] transition-shadow ${
        selected ? "shadow-lg ring-2 ring-stone-300" : ""
      }`}
      style={{ borderColor: color }}
    >
      <Handle type="target" position={Position.Top}    style={{ background: color }} />
      <Handle type="source" position={Position.Bottom} style={{ background: color }} />
      <Handle type="target" position={Position.Left}   id="left"  style={{ background: color }} />
      <Handle type="source" position={Position.Right}  id="right" style={{ background: color }} />

      <div className="px-2 py-1 rounded-t-xl text-[9px] font-bold text-white" style={{ backgroundColor: color }}>
        ✏️ テキスト
      </div>

      <div
        className="px-3 py-2 cursor-text min-h-[40px]"
        onDoubleClick={() => setEditing(true)}
      >
        {editing ? (
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={handleBlur}
            className="w-full text-[12px] text-stone-700 resize-none border-none outline-none bg-transparent leading-relaxed"
            rows={3}
          />
        ) : (
          <p className="text-[12px] text-stone-700 leading-relaxed whitespace-pre-wrap">
            {text || <span className="text-stone-300 italic">ダブルクリックで編集</span>}
          </p>
        )}
      </div>
    </div>
  );
}
