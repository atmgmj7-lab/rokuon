"use client";
import { useRef, useState } from "react";
import { EdgeLabelRenderer, EdgeProps, getBezierPath, getSmoothStepPath, getStraightPath } from "reactflow";

export type EdgePathType = "smoothstep" | "bezier" | "straight";

export interface LabeledEdgeData {
  pathType?: EdgePathType;
  onLabelChange?: (id: string, label: string) => void;
}

export default function LabeledEdge({
  id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition,
  label, data, markerEnd, style, selected,
}: EdgeProps<LabeledEdgeData>) {
  const [editing,   setEditing]   = useState(false);
  const [labelText, setLabelText] = useState(typeof label === "string" ? label : "If...");
  const inputRef = useRef<HTMLInputElement>(null);

  const pathType = (data as LabeledEdgeData | undefined)?.pathType ?? "smoothstep";

  let edgePath: string, labelX: number, labelY: number;
  if (pathType === "straight") {
    [edgePath, labelX, labelY] = getStraightPath({ sourceX, sourceY, targetX, targetY });
  } else if (pathType === "bezier") {
    [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
  } else {
    [edgePath, labelX, labelY] = getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
  }

  const commit = () => {
    setEditing(false);
    const next = labelText.trim() || "If...";
    setLabelText(next);
    (data as LabeledEdgeData | undefined)?.onLabelChange?.(id, next);
  };

  const strokeColor = selected ? "#C2410C" : "#A8A29E";

  return (
    <>
      <path d={edgePath} fill="none" strokeOpacity={0} strokeWidth={20} className="react-flow__edge-interaction" />
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth={selected ? 2.5 : 1.5}
        markerEnd={markerEnd}
        style={style}
        className="react-flow__edge-path"
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%,-50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
          className="nodrag nopan"
          onDoubleClick={() => { setEditing(true); setTimeout(() => inputRef.current?.select(), 0); }}
        >
          {editing ? (
            <input
              ref={inputRef}
              value={labelText}
              onChange={(e) => setLabelText(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
              onClick={(e) => e.stopPropagation()}
              className="text-[10px] px-1.5 py-0.5 bg-white border border-orange-400 rounded shadow outline-none w-28 text-stone-700"
            />
          ) : (
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded shadow-sm font-medium cursor-text whitespace-nowrap transition-colors ${
                selected
                  ? "bg-orange-50 border border-orange-400 text-orange-700"
                  : "bg-white border border-stone-300 text-stone-500"
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
