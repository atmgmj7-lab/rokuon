"use client";
import { Handle, Position, NodeProps } from "reactflow";
import { useState } from "react";

export interface SectionNodeData {
  label: string;
  color?: string;
  onLabelChange?: (id: string, label: string) => void;
}

export default function SectionNode({ id, data, selected }: NodeProps<SectionNodeData>) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel]     = useState(data.label);
  const color = data.color ?? "#F59E0B";

  const handleBlur = () => {
    setEditing(false);
    data.onLabelChange?.(id, label);
  };

  return (
    <div
      className={`rounded-2xl border-2 border-dashed flex items-start justify-start p-3 transition-shadow ${
        selected ? "shadow-lg" : ""
      }`}
      style={{
        borderColor:     color,
        backgroundColor: `${color}18`,
        minWidth:  200,
        minHeight: 120,
        width:     "100%",
        height:    "100%",
      }}
    >
      <Handle type="target" position={Position.Top}    style={{ background: color }} />
      <Handle type="source" position={Position.Bottom} style={{ background: color }} />
      <Handle type="target" position={Position.Left}   id="left"  style={{ background: color }} />
      <Handle type="source" position={Position.Right}  id="right" style={{ background: color }} />

      {editing ? (
        <input
          autoFocus
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={handleBlur}
          className="text-sm font-bold border-b outline-none bg-transparent"
          style={{ color, borderColor: color }}
        />
      ) : (
        <span
          className="text-sm font-bold cursor-pointer select-none"
          style={{ color }}
          onDoubleClick={() => setEditing(true)}
        >
          {label}
        </span>
      )}
    </div>
  );
}
