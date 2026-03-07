"use client";

export const PALETTE = [
  "#3B82F6", // 青
  "#10B981", // 緑
  "#F59E0B", // 黄
  "#EF4444", // 赤
  "#8B5CF6", // 紫
  "#EC4899", // ピンク
  "#F97316", // オレンジ
  "#6B7280", // グレー
  "#1F2937", // 黒
  "#FBBF24", // 金
];

interface Props {
  current: string;
  onChange: (color: string) => void;
}

export default function ColorPicker({ current, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-1 p-1.5 bg-white rounded-lg border border-stone-200 shadow-md">
      {PALETTE.map((c) => (
        <button
          key={c}
          title={c}
          onMouseDown={(e) => { e.stopPropagation(); onChange(c); }}
          className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-125 focus:outline-none"
          style={{
            backgroundColor: c,
            borderColor: current === c ? "white" : "transparent",
            boxShadow: current === c ? `0 0 0 1.5px ${c}` : "none",
          }}
        />
      ))}
    </div>
  );
}
