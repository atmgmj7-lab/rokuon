"use client";
import { useRef, useState } from "react";
import { EdgeLabelRenderer, EdgeProps, getBezierPath, getSmoothStepPath, getStraightPath } from "reactflow";

export type EdgePathType = "smoothstep" | "bezier" | "straight";

const EDGE_COLORS = ["#A8A29E", "#C2410C", "#3B82F6", "#10B981", "#9333EA", "#F59E0B", "#374151", "#EC4899"];
const EDGE_WIDTHS: { label: string; value: number }[] = [
  { label: "細", value: 1.5 },
  { label: "中", value: 2.5 },
  { label: "太", value: 4 },
];

export interface LabeledEdgeData {
  pathType?:         EdgePathType;
  edgeColor?:        string;
  edgeWidth?:        number;
  onLabelChange?:    (id: string, label: string) => void;
  onEdgeStyleChange?:(id: string, color: string, width: number) => void;
}

export default function LabeledEdge({
  id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition,
  label, data, markerEnd, style, selected,
}: EdgeProps<LabeledEdgeData>) {
  const [editing,     setEditing]     = useState(false);
  const [showStyle,   setShowStyle]   = useState(false);
  const [labelText,   setLabelText]   = useState(typeof label === "string" ? label : "If...");
  const inputRef = useRef<HTMLInputElement>(null);

  const d = data as LabeledEdgeData | undefined;
  const pathType   = d?.pathType   ?? "smoothstep";
  const edgeColor  = d?.edgeColor  ?? (selected ? "#C2410C" : "#A8A29E");
  const edgeWidth  = d?.edgeWidth  ?? (selected ? 2.5 : 1.5);

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
    d?.onLabelChange?.(id, next);
  };

  const strokeColor = d?.edgeColor ?? (selected ? "#C2410C" : "#A8A29E");
  const strokeWidth = d?.edgeWidth ?? (selected ? 2.5 : 1.5);

  return (
    <>
      <path d={edgePath} fill="none" strokeOpacity={0} strokeWidth={20} className="react-flow__edge-interaction" />
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
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
          onDoubleClick={() => { setEditing(true); setShowStyle(false); setTimeout(() => inputRef.current?.select(), 0); }}
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
            <div className="flex flex-col items-center gap-0.5">
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded shadow-sm font-medium cursor-text whitespace-nowrap transition-colors ${
                  selected
                    ? "bg-orange-50 border border-orange-400 text-orange-700"
                    : "bg-white border border-stone-300 text-stone-500"
                }`}
                title="ダブルクリックで編集"
                onClick={(e) => { if (selected) { e.stopPropagation(); setShowStyle((v) => !v); } }}
              >
                {labelText || "If..."}
              </span>

              {/* Edge style picker (shown when selected and label clicked) */}
              {showStyle && selected && (
                <div
                  className="bg-white border border-stone-200 rounded-xl px-2 py-1.5 shadow-lg flex flex-col gap-1.5 min-w-max"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] text-stone-400 font-medium w-8">色</span>
                    <div className="flex gap-1">
                      {EDGE_COLORS.map((c) => (
                        <button key={c}
                          onMouseDown={(e) => { e.stopPropagation(); d?.onEdgeStyleChange?.(id, c, strokeWidth); }}
                          className={`w-4 h-4 rounded-full border-[1.5px] ${edgeColor === c ? "border-stone-700 scale-110" : "border-transparent"}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] text-stone-400 font-medium w-8">太さ</span>
                    <div className="flex gap-1">
                      {EDGE_WIDTHS.map(({ label: wl, value: w }) => (
                        <button key={w}
                          onMouseDown={(e) => { e.stopPropagation(); d?.onEdgeStyleChange?.(id, edgeColor, w); }}
                          className={`px-1.5 py-0.5 text-[9px] rounded ${strokeWidth === w ? "bg-stone-700 text-white" : "bg-stone-100 text-stone-600"}`}
                        >
                          {wl}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
