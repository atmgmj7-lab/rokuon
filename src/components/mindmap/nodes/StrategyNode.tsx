"use client";
import { Handle, Position, NodeProps, NodeResizer } from "reactflow";
import { useState } from "react";
import { ChevronDown, ChevronRight, Lightbulb, MessageSquare, Palette, Target } from "lucide-react";
import NodeVoiceNote from "./NodeVoiceNote";
import ColorPicker from "../ColorPicker";

const TIER_CONFIG = {
  strategy1: { defaultColor: "#EF4444", bg: "#FFF7F7", Icon: MessageSquare, tier: "代表アウト", hasAudio: false },
  strategy2: { defaultColor: "#3B82F6", bg: "#F0F7FF", Icon: Lightbulb,     tier: "代表心理",  hasAudio: false },
  strategy3: { defaultColor: "#10B981", bg: "#F0FDF9", Icon: Target,         tier: "実行",      hasAudio: true  },
} as const;

export interface StrategyNodeData {
  label: string;
  color?: string;
  audio_url?: string | null;
  r2_key?: string | null;
  parent_id?: string | null;
  onLabelChange?:    (id: string, label: string) => void;
  onColorChange?:    (id: string, color: string) => void;
  onRecordingSaved?: (id: string, audioUrl: string, r2Key: string) => void;
  onAudioDeleted?:   (id: string) => void;
}

export default function StrategyNode({ id, type, data, selected }: NodeProps<StrategyNodeData>) {
  const tierKey = (type ?? "strategy1") as keyof typeof TIER_CONFIG;
  const cfg     = TIER_CONFIG[tierKey] ?? TIER_CONFIG.strategy1;
  const { defaultColor, bg, Icon, tier, hasAudio } = cfg;
  const color = data.color ?? defaultColor;

  const [editing,    setEditing]    = useState(false);
  const [label,      setLabel]      = useState(data.label);
  const [collapsed,  setCollapsed]  = useState(false);
  const [showColors, setShowColors] = useState(false);

  const commit = () => {
    setEditing(false);
    const next = label.trim() || "無題";
    setLabel(next);
    data.onLabelChange?.(id, next);
  };

  const openEdit = () => {
    if (selected) setEditing(true);
  };

  const showBody = hasAudio && !collapsed;

  return (
    <div
      className={`rounded-xl border-2 shadow-sm transition-shadow bg-white ${selected ? "shadow-md" : ""}`}
      style={{ borderColor: color, minWidth: 190, minHeight: 44 }}
    >
      <NodeResizer
        minWidth={160} minHeight={44}
        isVisible={selected}
        lineStyle={{ borderColor: color }}
        handleStyle={{ backgroundColor: color, width: 8, height: 8 }}
      />

      {/* LR ハンドルのみ（上下なし） */}
      <Handle type="target" position={Position.Left}  id="left"  style={{ background: color, width: 10, height: 10 }} />
      <Handle type="source" position={Position.Right} id="right" style={{ background: color, width: 10, height: 10 }} />

      {/* ヘッダー */}
      <div
        className="px-3 py-1.5 rounded-t-xl text-white text-[10px] font-bold flex items-center gap-1.5"
        style={{ backgroundColor: color, borderRadius: showBody ? undefined : "0.75rem" }}
      >
        <Icon className="w-3.5 h-3.5 shrink-0" />
        <span className="text-[9px] bg-white/20 rounded px-1 shrink-0">{tier}</span>
        {editing ? (
          <input
            autoFocus
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 bg-white/15 rounded px-1 py-0.5 text-[10px] outline-none min-w-0"
          />
        ) : (
          <span
            className="nodrag flex-1 truncate min-w-0 cursor-text"
            onClick={openEdit}
            title={selected ? "クリックで編集" : "クリックで選択、再クリックで編集"}
          >
            {label}
          </span>
        )}
        <div className="flex items-center gap-0.5 shrink-0">
          {selected && (
            <button
              onMouseDown={(e) => { e.stopPropagation(); setShowColors((v) => !v); }}
              className="opacity-70 hover:opacity-100 p-0.5"
              title="色を変更"
            >
              <Palette className="w-3 h-3" />
            </button>
          )}
          {hasAudio && (
            <button
              onMouseDown={(e) => { e.stopPropagation(); setCollapsed((v) => !v); }}
              className="opacity-70 hover:opacity-100 p-0.5"
              title={collapsed ? "展開" : "折りたたむ"}
            >
              {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
        </div>
      </div>

      {/* カラーパレット */}
      {showColors && selected && (
        <div className="absolute top-full left-0 mt-1 z-50">
          <ColorPicker current={color} onChange={(c) => { data.onColorChange?.(id, c); setShowColors(false); }} />
        </div>
      )}

      {/* 音声メモ（実行ノードのみ・展開時） */}
      {showBody && (
        <div className="px-3 py-2">
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
