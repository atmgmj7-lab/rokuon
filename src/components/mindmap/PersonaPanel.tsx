"use client";
import { useEffect, useRef, useState } from "react";
import { X, User, Plus, Trash2 } from "lucide-react";

interface KVEntry { key: string; value: string; }

interface Props {
  mapId: string;
  initialData: string | null;
  onClose: () => void;
}

function parseEntries(raw: string | null): KVEntry[] {
  if (!raw) return [];
  try {
    const p = JSON.parse(raw) as unknown;
    if (Array.isArray(p)) return (p as KVEntry[]).filter((e) => typeof e.key === "string");
  } catch {}
  // legacy fixed-field format → convert to KV
  try {
    const obj = JSON.parse(raw) as Record<string, string>;
    return Object.entries(obj)
      .filter(([, v]) => v)
      .map(([k, v]) => ({ key: k, value: v }));
  } catch {}
  return [];
}

export default function PersonaPanel({ mapId, initialData, onClose }: Props) {
  const [entries, setEntries] = useState<KVEntry[]>(() => parseEntries(initialData));
  const [saving, setSaving] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persist = (next: KVEntry[]) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setSaving(true);
      fetch(`/api/mind-maps/${mapId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ persona_data: JSON.stringify(next) }),
      })
        .catch(() => {})
        .finally(() => setSaving(false));
    }, 1200);
  };

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const update = (index: number, field: "key" | "value", value: string) => {
    const next = entries.map((e, i) => (i === index ? { ...e, [field]: value } : e));
    setEntries(next);
    persist(next);
  };

  const addRow = () => {
    const next = [...entries, { key: "", value: "" }];
    setEntries(next);
  };

  const removeRow = (index: number) => {
    const next = entries.filter((_, i) => i !== index);
    setEntries(next);
    persist(next);
  };

  return (
    <div className="w-72 h-full bg-white border-l border-stone-200 shadow-lg flex flex-col shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-orange-600" />
          <span className="text-sm font-bold text-stone-700">ペルソナ設定</span>
        </div>
        <div className="flex items-center gap-2">
          {saving && <span className="text-[10px] text-stone-400">保存中...</span>}
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KV list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {entries.length === 0 && (
          <p className="text-[11px] text-stone-400 italic text-center mt-6">
            「＋ 項目を追加」で自由に項目を作れます
          </p>
        )}
        {entries.map((entry, i) => (
          <div key={i} className="flex items-start gap-1.5 group">
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <input
                type="text"
                value={entry.key}
                onChange={(e) => update(i, "key", e.target.value)}
                placeholder="項目名"
                className="w-full text-[11px] font-semibold text-stone-600 border border-stone-200 rounded-md px-2 py-1 outline-none focus:border-orange-400 bg-stone-50"
              />
              <textarea
                value={entry.value}
                onChange={(e) => update(i, "value", e.target.value)}
                placeholder="内容"
                rows={2}
                className="w-full text-[12px] text-stone-700 border border-stone-200 rounded-md px-2 py-1 outline-none focus:border-orange-400 resize-none bg-white leading-relaxed"
              />
            </div>
            <button
              onClick={() => removeRow(i)}
              className="mt-1 text-stone-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Add row */}
      <div className="px-4 pb-3">
        <button
          onClick={addRow}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-stone-300 text-[11px] text-stone-500 hover:border-orange-400 hover:text-orange-500 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          項目を追加
        </button>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-stone-100">
        <p className="text-[10px] text-stone-400">入力内容は自動で保存されます</p>
      </div>
    </div>
  );
}
