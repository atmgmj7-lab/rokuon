"use client";
import { Handle, Position, NodeProps, NodeResizer } from "reactflow";
import { useState } from "react";
import ColorPicker from "../ColorPicker";

export interface ScriptItemNodeData {
  label: string;
  content?: string;
  color?: string;
  script_item_id?: string;
  onColorChange?: (id: string, color: string) => void;
}

export default function ScriptItemNode({ id, data, selected }: NodeProps<ScriptItemNodeData>) {
  const [expanded, setExpanded]       = useState(false);
  const [showColors, setShowColors]   = useState(false);
  const color = data.color ?? "#3B82F6";

  return (
    <div
      className={`rounded-xl border-2 bg-white shadow-sm transition-shadow ${
        selected ? "shadow-lg" : ""
      }`}
      style={{ borderColor: color, minWidth: 200, minHeight: 60 }}
    >
      <NodeResizer
        minWidth={160} minHeight={60}
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
        className="px-3 py-1.5 rounded-t-xl text-white text-xs font-bold flex items-center gap-1"
        style={{ backgroundColor: color }}
      >
        <span className="text-[10px]">📋</span>
        <span className="flex-1 truncate">{data.label}</span>
        {selected && (
          <button
            onMouseDown={(e) => { e.stopPropagation(); setShowColors((v) => !v); }}
            className="opacity-70 hover:opacity-100 text-[10px] ml-1"
            title="色を変更"
          >🎨</button>
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

      {/* 本文プレビュー */}
      {data.content && (
        <div className="px-3 py-2">
          <p className={`text-[11px] text-stone-600 leading-relaxed ${expanded ? "" : "line-clamp-3"}`}>
            {data.content}
          </p>
          {data.content.length > 100 && (
            <button
              onMouseDown={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
              className="text-[10px] text-blue-500 mt-1 hover:underline"
            >
              {expanded ? "閉じる" : "続きを見る"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
