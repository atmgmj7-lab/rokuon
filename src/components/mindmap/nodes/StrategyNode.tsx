"use client";
import { Handle, Position, NodeProps, NodeResizer } from "reactflow";
import { useState } from "react";
import { Lightbulb, MessageSquare, Target } from "lucide-react";
import NodeVoiceNote from "./NodeVoiceNote";

const TIER_CONFIG = {
  strategy1: { color: "#EF4444", bg: "#FEF2F2", Icon: MessageSquare, tier: "現象" },
  strategy2: { color: "#3B82F6", bg: "#EFF6FF", Icon: Lightbulb,     tier: "心理" },
  strategy3: { color: "#10B981", bg: "#ECFDF5", Icon: Target,         tier: "実行" },
} as const;

export interface StrategyNodeData {
  label: string;
  audio_url?: string | null;
  r2_key?: string | null;
  parent_id?: string | null;
  onLabelChange?:    (id: string, label: string) => void;
  onRecordingSaved?: (id: string, audioUrl: string, r2Key: string) => void;
  onAudioDeleted?:   (id: string) => void;
}

export default function StrategyNode({ id, type, data, selected }: NodeProps<StrategyNodeData>) {
  const tierKey = (type ?? "strategy1") as keyof typeof TIER_CONFIG;
  const cfg     = TIER_CONFIG[tierKey] ?? TIER_CONFIG.strategy1;
  const { color, bg, Icon, tier } = cfg;

  const [editing, setEditing] = useState(false);
  const [label,   setLabel]   = useState(data.label);

  const commit = () => {
    setEditing(false);
    const next = label.trim() || "無題";
    setLabel(next);
    data.onLabelChange?.(id, next);
  };

  return (
    <div
      className={`rounded-xl border-2 shadow-sm transition-shadow ${selected ? "shadow-lg" : ""}`}
      style={{ borderColor: color, background: bg, minWidth: 190, minHeight: 60 }}
    >
      <NodeResizer
        minWidth={160} minHeight={50}
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
        className="px-3 py-1.5 rounded-t-xl text-white text-[10px] font-bold flex items-center gap-1.5"
        style={{ backgroundColor: color }}
      >
        <Icon className="w-3.5 h-3.5" />
        <span className="text-[9px] bg-white/20 rounded px-1 shrink-0">{tier}</span>
        {editing ? (
          <input
            autoFocus
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => { if (e.key === "Enter") commit(); }}
            className="flex-1 bg-white/15 rounded px-1 py-0.5 text-[10px] outline-none min-w-0"
          />
        ) : (
          <span
            className="flex-1 truncate min-w-0"
            onDoubleClick={() => setEditing(true)}
            title="ダブルクリックでタイトル編集"
          >
            {label}
          </span>
        )}
      </div>

      {/* 音声メモ */}
      <div className="px-3 py-2">
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
