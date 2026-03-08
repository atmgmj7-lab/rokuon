"use client";
import { Handle, Position, NodeProps, NodeResizer } from "reactflow";
import { useState } from "react";
import ColorPicker from "../ColorPicker";
import NodeVoiceNote from "./NodeVoiceNote";
import { ChevronDown, ChevronRight, Palette, Type } from "lucide-react";

const COMMENT_SIZE_PX = { S: 10, M: 12, L: 14 } as const;
const COMMENT_COLORS  = ["#78716C", "#C2410C", "#0EA5E9", "#16A34A", "#9333EA", "#D97706"];

interface ContentData {
  body: string;
  comment: { text: string; color: string; size: "S" | "M" | "L" };
}

function parseContent(raw: string | null | undefined): ContentData {
  if (!raw) return { body: "", comment: { text: "", color: "#78716C", size: "M" } };
  try {
    const p = JSON.parse(raw) as unknown;
    if (typeof p === "object" && p !== null && "body" in p) return p as ContentData;
  } catch {}
  return { body: raw, comment: { text: "", color: "#78716C", size: "M" } };
}

export interface TextNodeData {
  label: string;
  content?: string;
  color?: string;
  bgColor?: string;
  borderWidth?: number;
  audio_url?: string | null;
  r2_key?: string | null;
  onRecordingSaved?:    (id: string, audioUrl: string, r2Key: string) => void;
  onAudioDeleted?:      (id: string) => void;
  onLabelChange?:       (id: string, label: string) => void;
  onContentChange?:     (id: string, content: string) => void;
  onColorChange?:       (id: string, color: string)  => void;
  onBgColorChange?:     (id: string, color: string)  => void;
  onBorderWidthChange?: (id: string, width: number)  => void;
}

const BG_COLORS = ["#FFFFFF", "#F7F6F4", "#FFF7ED", "#EFF6FF", "#F0FDF4", "#FAF5FF", "#FEFCE8", "#FFF1F2"];

export default function TextNode({ id, data, selected }: NodeProps<TextNodeData>) {
  const parsed = parseContent(data.content);
  const [collapsed,    setCollapsed]    = useState(false);
  const [editTitle,    setEditTitle]    = useState(false);
  const [editBody,     setEditBody]     = useState(false);
  const [showColors,   setShowColors]   = useState(false);
  const [showBgColors, setShowBgColors] = useState(false);
  const [title,        setTitle]        = useState(data.label);
  const [body,         setBody]         = useState(parsed.body);
  const [commentText,  setCommentText]  = useState(parsed.comment.text);
  const [commentColor, setCommentColor] = useState(parsed.comment.color);
  const [commentSize,  setCommentSize]  = useState<"S" | "M" | "L">(parsed.comment.size);

  const color       = data.color       ?? "#78716C";
  const bgColor     = data.bgColor     ?? "#FFFFFF";
  const borderWidth = data.borderWidth ?? 1;

  const encode = (b: string, ct: string, cc: string, cs: "S" | "M" | "L") =>
    JSON.stringify({ body: b, comment: { text: ct, color: cc, size: cs } });

  const commitTitle = () => {
    setEditTitle(false);
    const next = title.trim() || "無題";
    setTitle(next);
    data.onLabelChange?.(id, next);
  };

  const commitBody = (b = body) => {
    setEditBody(false);
    data.onContentChange?.(id, encode(b, commentText, commentColor, commentSize));
  };

  const commitComment = (ct = commentText, cc = commentColor, cs = commentSize) => {
    data.onContentChange?.(id, encode(body, ct, cc, cs));
  };

  return (
    <div
      className={`rounded-xl border shadow-sm transition-shadow ${selected ? "shadow-md" : ""}`}
      style={{ borderColor: color, borderWidth, minWidth: 160, backgroundColor: bgColor }}
    >
      <NodeResizer
        minWidth={120} minHeight={44}
        isVisible={selected}
        lineStyle={{ borderColor: color }}
        handleStyle={{ backgroundColor: color, width: 8, height: 8 }}
      />
      <Handle type="target" position={Position.Left}  id="left"  style={{ background: color, width: 10, height: 10 }} />
      <Handle type="source" position={Position.Right} id="right" style={{ background: color, width: 10, height: 10 }} />

      {/* Header */}
      <div
        className="px-2 py-1 text-white text-[9px] font-bold flex items-center gap-1"
        style={{ backgroundColor: color, borderRadius: collapsed ? `${borderWidth + 3}px` : `${borderWidth + 3}px ${borderWidth + 3}px 0 0` }}
      >
        <Type className="w-3.5 h-3.5 opacity-90 shrink-0" />
        {editTitle ? (
          <input
            autoFocus value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => { if (e.key === "Enter") commitTitle(); if (e.key === "Escape") setEditTitle(false); }}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 bg-white/15 rounded px-1 py-0.5 text-[10px] outline-none"
          />
        ) : (
          <span
            className="nodrag flex-1 truncate cursor-text"
            onClick={() => { if (selected) setEditTitle(true); }}
            onDoubleClick={() => setEditTitle(true)}
            title="クリックで編集"
          >{title}</span>
        )}
        <div className="flex items-center gap-0.5 shrink-0">
          {selected && (
            <>
              <button onMouseDown={(e) => { e.stopPropagation(); setShowBgColors((v) => !v); setShowColors(false); }} className="opacity-70 hover:opacity-100" title="背景色">
                <span className="inline-block w-3 h-3 rounded-sm border border-white/50" style={{ backgroundColor: bgColor }} />
              </button>
              <button onMouseDown={(e) => { e.stopPropagation(); setShowColors((v) => !v); setShowBgColors(false); }} className="opacity-70 hover:opacity-100" title="枠線・テキスト色">
                <Palette className="w-3 h-3" />
              </button>
            </>
          )}
          <button onMouseDown={(e) => { e.stopPropagation(); setCollapsed((v) => !v); }} className="opacity-70 hover:opacity-100" title={collapsed ? "展開" : "折りたたむ"}>
            {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Accent color picker */}
      {showColors && selected && (
        <div className="absolute top-full left-0 mt-1 z-50">
          <ColorPicker current={color} onChange={(c) => { data.onColorChange?.(id, c); setShowColors(false); }} />
        </div>
      )}

      {/* BG color picker */}
      {showBgColors && selected && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-stone-200 rounded-xl p-2 shadow-lg flex flex-wrap gap-1.5 w-52">
          <p className="w-full text-[9px] text-stone-400 font-medium mb-0.5">背景色</p>
          {BG_COLORS.map((c) => (
            <button key={c}
              onMouseDown={(e) => { e.stopPropagation(); data.onBgColorChange?.(id, c); setShowBgColors(false); }}
              className={`w-5 h-5 rounded border-[1.5px] ${bgColor === c ? "border-stone-700" : "border-stone-200"}`}
              style={{ backgroundColor: c }}
            />
          ))}
          <div className="w-full border-t border-stone-100 mt-1 pt-1">
            <p className="text-[9px] text-stone-400 font-medium mb-1">枠線の太さ</p>
            <div className="flex gap-1">
              {([1, 2, 3, 4] as const).map((w) => (
                <button key={w}
                  onMouseDown={(e) => { e.stopPropagation(); data.onBorderWidthChange?.(id, w); }}
                  className={`px-2 py-0.5 text-[9px] rounded ${borderWidth === w ? "bg-stone-700 text-white" : "bg-stone-100 text-stone-600"}`}
                >
                  {w === 1 ? "細" : w === 2 ? "中" : w === 3 ? "太" : "極"}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {!collapsed && (
        <div className="px-3 py-2 space-y-2">
          {editBody ? (
            <textarea
              autoFocus value={body}
              onChange={(e) => setBody(e.target.value)}
              onBlur={() => commitBody()}
              onClick={(e) => e.stopPropagation()}
              className="nodrag w-full text-[12px] text-stone-700 resize-none border border-stone-200 rounded p-1 outline-none bg-stone-50 leading-relaxed"
              style={{ minHeight: 60 }}
            />
          ) : (
            <p
              className="nodrag text-[12px] text-stone-700 leading-relaxed whitespace-pre-wrap"
              onClick={() => { if (selected) setEditBody(true); }}
              onDoubleClick={() => setEditBody(true)}
              style={{ cursor: selected ? "text" : "default", minHeight: 32 }}
            >
              {body || (selected
                ? <span className="text-stone-300 italic">クリックして入力…</span>
                : <span className="text-stone-300 italic">ダブルクリックで選択</span>)}
            </p>
          )}

          {/* 注釈 */}
          <div className="border-t border-stone-100 pt-1.5">
            <div className="flex items-center gap-1 mb-1">
              <span className="text-[9px] text-stone-400 font-medium">注釈</span>
              <div className="flex items-center gap-0.5">
                {(["S", "M", "L"] as const).map((s) => (
                  <button key={s}
                    onMouseDown={(e) => { e.stopPropagation(); setCommentSize(s); commitComment(commentText, commentColor, s); }}
                    className={`text-[8px] px-1 rounded leading-tight ${commentSize === s ? "bg-stone-600 text-white" : "bg-stone-100 text-stone-500"}`}
                  >{s}</button>
                ))}
              </div>
              <div className="flex items-center gap-0.5 ml-1">
                {COMMENT_COLORS.map((c) => (
                  <button key={c}
                    onMouseDown={(e) => { e.stopPropagation(); setCommentColor(c); commitComment(commentText, c, commentSize); }}
                    className={`w-3 h-3 rounded-full border-[1.5px] ${commentColor === c ? "border-stone-700" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onBlur={() => commitComment()}
              onClick={(e) => e.stopPropagation()}
              className="nodrag w-full resize-none border border-stone-100 rounded p-1 outline-none bg-stone-50/50 leading-relaxed"
              style={{ fontSize: COMMENT_SIZE_PX[commentSize], color: commentColor, minHeight: 28 }}
              placeholder="注釈を入力..."
            />
          </div>

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
