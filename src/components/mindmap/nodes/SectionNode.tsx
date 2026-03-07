"use client";
import { Handle, Position, NodeProps, NodeResizer } from "reactflow";
import { useState } from "react";
import ColorPicker from "../ColorPicker";
import NodeVoiceNote from "./NodeVoiceNote";
import { Palette, Shapes } from "lucide-react";

export interface SectionNodeData {
  label: string;
  color?: string;
  audio_url?: string | null;
  r2_key?: string | null;
  onRecordingSaved?: (id: string, audioUrl: string, r2Key: string) => void;
  onLabelChange?:  (id: string, label: string) => void;
  onColorChange?:  (id: string, color: string) => void;
}

export default function SectionNode({ id, data, selected }: NodeProps<SectionNodeData>) {
  const [editing, setEditing]     = useState(false);
  const [label, setLabel]         = useState(data.label);
  const [showColors, setShowColors] = useState(false);
  const color = data.color ?? "#F59E0B";

  const handleBlur = () => {
    setEditing(false);
    data.onLabelChange?.(id, label);
  };

  return (
    <div
      className={`rounded-2xl border-2 border-dashed flex flex-col items-start justify-start p-3 transition-shadow ${
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
      <NodeResizer
        minWidth={180} minHeight={100}
        isVisible={selected}
        lineStyle={{ borderColor: color }}
        handleStyle={{ backgroundColor: color, width: 8, height: 8 }}
      />

      <Handle type="target" position={Position.Top}    style={{ background: color }} />
      <Handle type="source" position={Position.Bottom} style={{ background: color }} />
      <Handle type="target" position={Position.Left}   id="left"  style={{ background: color }} />
      <Handle type="source" position={Position.Right}  id="right" style={{ background: color }} />

      <div className="flex items-center gap-1 w-full">
        <Shapes className="w-4 h-4" style={{ color }} />
        {editing ? (
          <input
            autoFocus
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => { if (e.key === "Enter") handleBlur(); }}
            className="flex-1 text-sm font-bold border-b outline-none bg-transparent"
            style={{ color, borderColor: color }}
          />
        ) : (
          <span
            className="flex-1 text-sm font-bold cursor-pointer select-none"
            style={{ color }}
            onDoubleClick={() => setEditing(true)}
          >
            {label}
          </span>
        )}
        {selected && (
          <button
            onMouseDown={(e) => { e.stopPropagation(); setShowColors((v) => !v); }}
            className="opacity-80 hover:opacity-100 ml-1"
            title="色を変更"
          >
            <Palette className="w-4 h-4" />
          </button>
        )}
      </div>

      {showColors && selected && (
        <div className="absolute top-full left-0 mt-1 z-50">
          <ColorPicker
            current={color}
            onChange={(c) => { data.onColorChange?.(id, c); setShowColors(false); }}
          />
        </div>
      )}

      <div className="mt-2">
        <NodeVoiceNote
          nodeId={id}
          audioUrl={data.audio_url ?? null}
          onSaved={(nid, url, r2) => data.onRecordingSaved?.(nid, url, r2)}
        />
      </div>
    </div>
  );
}
