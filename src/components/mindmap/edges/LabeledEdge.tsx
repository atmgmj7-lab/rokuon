"use client";
import { useRef, useState } from "react";
import { EdgeLabelRenderer, EdgeProps, getSmoothStepPath } from "reactflow";

export interface LabeledEdgeData {
  onLabelChange?: (id: string, label: string) => void;
}

export default function LabeledEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  label,
  data,
  markerEnd,
  style,
  selected,
}: EdgeProps<LabeledEdgeData>) {
  const [editing,   setEditing]   = useState(false);
  const [labelText, setLabelText] = useState(typeof label === "string" ? label : "If...");
  const inputRef = useRef<HTMLInputElement>(null);

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  });

  const commit = () => {
    setEditing(false);
    const next = labelText.trim() || "If...";
    setLabelText(next);
    (data as LabeledEdgeData | undefined)?.onLabelChange?.(id, next);
  };

  const strokeColor = selected ? "#60a5fa" : "#4a6fa5";

  return (
    <>
      {/* クリック判定用の透明な太いパス */}
      <path
        d={edgePath}
        fill="none"
        strokeOpacity={0}
        strokeWidth={20}
        className="react-flow__edge-interaction"
      />
      {/* 実際に見えるパス */}
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth={selected ? 2.5 : 2}
        strokeDasharray={selected ? undefined : undefined}
        markerEnd={markerEnd}
        style={style}
        className="react-flow__edge-path"
      />

      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
          className="nodrag nopan"
          onDoubleClick={() => {
            setEditing(true);
            setTimeout(() => inputRef.current?.select(), 0);
          }}
        >
          {editing ? (
            <input
              ref={inputRef}
              value={labelText}
              onChange={(e) => setLabelText(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === "Enter")  { e.preventDefault(); commit(); }
                if (e.key === "Escape") { setEditing(false); }
              }}
              onClick={(e) => e.stopPropagation()}
              className="text-[10px] px-1.5 py-0.5 bg-white border border-blue-400 rounded shadow-md outline-none w-28 text-stone-700"
            />
          ) : (
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded shadow-sm font-medium cursor-text whitespace-nowrap transition-colors ${
                selected
                  ? "bg-blue-600 border border-blue-500 text-white"
                  : "bg-[#0f172a]/90 border border-[#4a6fa5] text-[#93c5fd]"
              }`}
              title="ダブルクリックで編集"
            >
              {labelText || "If..."}
            </span>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
