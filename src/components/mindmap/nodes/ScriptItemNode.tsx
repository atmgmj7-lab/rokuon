"use client";
import { Handle, Position, NodeProps } from "reactflow";
import { useState } from "react";

export interface ScriptItemNodeData {
  label: string;
  content?: string;
  color?: string;
  onLabelChange?: (id: string, label: string) => void;
}

export default function ScriptItemNode({ id, data, selected }: NodeProps<ScriptItemNodeData>) {
  const [expanded, setExpanded] = useState(false);
  const color = data.color ?? "#3B82F6";

  return (
    <div
      className={`rounded-xl border-2 bg-white shadow-sm min-w-[200px] max-w-[280px] transition-shadow ${
        selected ? "shadow-lg ring-2 ring-blue-400" : ""
      }`}
      style={{ borderColor: color }}
    >
      <Handle type="target" position={Position.Top}    style={{ background: color }} />
      <Handle type="source" position={Position.Bottom} style={{ background: color }} />
      <Handle type="target" position={Position.Left}   id="left"  style={{ background: color }} />
      <Handle type="source" position={Position.Right}  id="right" style={{ background: color }} />

      {/* ヘッダー */}
      <div
        className="px-3 py-2 rounded-t-xl text-white text-xs font-bold flex items-center gap-1"
        style={{ backgroundColor: color }}
      >
        <span className="text-[10px]">📋</span>
        <span className="truncate">{data.label}</span>
      </div>

      {/* 本文プレビュー */}
      {data.content && (
        <div className="px-3 py-2">
          <p className={`text-[11px] text-stone-600 leading-relaxed ${expanded ? "" : "line-clamp-3"}`}>
            {data.content}
          </p>
          {data.content.length > 100 && (
            <button
              onClick={() => setExpanded((v) => !v)}
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
