"use client";
import { Handle, Position, NodeProps, NodeResizer } from "reactflow";
import { useState } from "react";
import ColorPicker from "../ColorPicker";
import NodeVoiceNote from "./NodeVoiceNote";
import { ChevronDown, ChevronRight, FileText, Palette } from "lucide-react";

export interface ScriptItemNodeData {
  label: string;
  content?: string;
  color?: string;
  script_item_id?: string;
  audio_url?: string | null;
  r2_key?: string | null;
  onRecordingSaved?: (id: string, audioUrl: string, r2Key: string) => void;
  onAudioDeleted?:   (id: string) => void;
  onLabelChange?:    (id: string, label: string) => void;
  onColorChange?:    (id: string, color: string) => void;
  onContentChange?:  (id: string, content: string) => void;
  onScriptSync?:     (scriptItemId: string, title: string, content: string) => void;
}

export default function ScriptItemNode({ id, data, selected }: NodeProps<ScriptItemNodeData>) {
  const [expanded,   setExpanded]   = useState(false);
  const [collapsed,  setCollapsed]  = useState(false);
  const [showColors, setShowColors] = useState(false);
  const [editLabel,  setEditLabel]  = useState(false);
  const [editBody,   setEditBody]   = useState(false);
  const [label,      setLabel]      = useState(data.label);
  const [content,    setContent]    = useState(data.content ?? "");
  const color = data.color ?? "#C2410C";

  const commitLabel = () => {
    setEditLabel(false);
    const next = label.trim() || "無題";
    setLabel(next);
    data.onLabelChange?.(id, next);
    if (data.script_item_id) data.onScriptSync?.(data.script_item_id, next, content);
  };

  const commitContent = () => {
    setEditBody(false);
    data.onContentChange?.(id, content);
    if (data.script_item_id) data.onScriptSync?.(data.script_item_id, label, content);
  };

  return (
    <div
      className={`rounded-xl border-2 bg-white shadow-sm transition-shadow ${selected ? "shadow-md" : ""}`}
      style={{ borderColor: color, minWidth: 200 }}
    >
      <NodeResizer
        minWidth={160} minHeight={44}
        isVisible={selected}
        lineStyle={{ borderColor: color }}
        handleStyle={{ backgroundColor: color, width: 8, height: 8 }}
      />

      {/* LR ハンドルのみ */}
      <Handle type="target" position={Position.Left}  id="left"  style={{ background: color, width: 10, height: 10 }} />
      <Handle type="source" position={Position.Right} id="right" style={{ background: color, width: 10, height: 10 }} />

      {/* ヘッダー */}
      <div
        className="px-3 py-1.5 rounded-t-xl text-white text-[11px] font-bold flex items-center gap-1"
        style={{ backgroundColor: color, borderRadius: collapsed ? "0.75rem" : undefined }}
      >
        <FileText className="w-3.5 h-3.5 opacity-90 shrink-0" />
        {editLabel ? (
          <input
            autoFocus
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={commitLabel}
            onKeyDown={(e) => { if (e.key === "Enter") commitLabel(); if (e.key === "Escape") setEditLabel(false); }}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 bg-white/15 rounded px-1 py-0.5 text-[11px] outline-none"
          />
        ) : (
          <span
            className="nodrag flex-1 truncate cursor-text"
            onClick={() => { if (selected) setEditLabel(true); }}
            title={selected ? "クリックでタイトル編集" : "クリックで選択、再クリックで編集"}
          >
            {label}
          </span>
        )}
        <div className="flex items-center gap-0.5 shrink-0">
          {selected && (
            <button
              onMouseDown={(e) => { e.stopPropagation(); setShowColors((v) => !v); }}
              className="opacity-80 hover:opacity-100"
              title="色を変更"
            >
              <Palette className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onMouseDown={(e) => { e.stopPropagation(); setCollapsed((v) => !v); }}
            className="opacity-80 hover:opacity-100"
            title={collapsed ? "展開" : "折りたたむ"}
          >
            {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
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
        <div className="px-3 py-2 space-y-2">
          {editBody ? (
            <textarea
              autoFocus
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onBlur={commitContent}
              onClick={(e) => e.stopPropagation()}
              className="nodrag w-full text-[11px] text-stone-700 resize-none border border-stone-200 rounded p-1 outline-none leading-relaxed bg-stone-50"
              style={{ minHeight: 80 }}
            />
          ) : (
            <>
              {content ? (
                <div>
                  <p
                    className={`nodrag text-[11px] text-stone-600 leading-relaxed whitespace-pre-wrap ${expanded ? "" : "line-clamp-3"}`}
                    onClick={() => { if (selected) setEditBody(true); }}
                    style={{ cursor: selected ? "text" : "default" }}
                    title={selected ? "クリックで本文編集" : undefined}
                  >
                    {content}
                  </p>
                  {content.length > 100 && (
                    <button
                      onMouseDown={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
                      className="text-[10px] text-orange-600 mt-1 hover:underline"
                    >
                      {expanded ? "閉じる ▲" : "続きを見る ▼"}
                    </button>
                  )}
                </div>
              ) : (
                selected && (
                  <p
                    className="nodrag text-[11px] text-stone-300 italic cursor-text"
                    onClick={() => setEditBody(true)}
                  >
                    クリックして本文を入力…
                  </p>
                )
              )}
            </>
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
