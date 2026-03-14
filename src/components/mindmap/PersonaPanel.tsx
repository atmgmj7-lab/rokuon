"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, X, User, Plus, Trash2 } from "lucide-react";

interface KVEntry { key: string; value: string; }

interface PersonaData {
  companyName?: string;
  hp?: string;
  googleMaps?: string;
  snsLinks?: string;
  entries?: KVEntry[];
}

interface Props {
  mapId: string;
  initialData: string | null;
  onClose: () => void;
}

function parsePersonaData(raw: string | null): PersonaData {
  if (!raw) return { entries: [] };
  try {
    const p = JSON.parse(raw) as unknown;
    if (Array.isArray(p)) {
      const entries = (p as KVEntry[]).filter((e) => typeof e.key === "string");
      return { entries };
    }
    if (p && typeof p === "object" && !Array.isArray(p)) {
      const obj = p as Record<string, unknown>;
      const entries = Array.isArray(obj.entries)
        ? (obj.entries as KVEntry[]).filter((e) => typeof e.key === "string")
        : [];
      return {
        companyName: typeof obj.companyName === "string" ? obj.companyName : "",
        hp: typeof obj.hp === "string" ? obj.hp : "",
        googleMaps: typeof obj.googleMaps === "string" ? obj.googleMaps : "",
        snsLinks: typeof obj.snsLinks === "string" ? obj.snsLinks : "",
        entries,
      };
    }
  } catch {}
  try {
    const obj = JSON.parse(raw) as Record<string, string>;
    const entries = Object.entries(obj).filter(([, v]) => v).map(([k, v]) => ({ key: k, value: v }));
    return { entries };
  } catch {}
  return { entries: [] };
}

function serializePersonaData(data: PersonaData): string {
  return JSON.stringify(data);
}

export default function PersonaPanel({ mapId, initialData, onClose }: Props) {
  const [personaData, setPersonaData] = useState<PersonaData>(() => parsePersonaData(initialData));
  const [saving, setSaving] = useState(false);
  const [closedEntries, setClosedEntries] = useState<Set<number>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const entries = personaData.entries ?? [];

  const persist = (next: PersonaData) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setSaving(true);
      fetch(`/api/mind-maps/${mapId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ persona_data: serializePersonaData(next) }),
      })
        .catch(() => {})
        .finally(() => setSaving(false));
    }, 1200);
  };

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const updateFixedField = (field: "companyName" | "hp" | "googleMaps" | "snsLinks", value: string) => {
    const next = { ...personaData, [field]: value };
    setPersonaData(next);
    persist(next);
  };

  const update = (index: number, field: "key" | "value", value: string) => {
    const nextEntries = entries.map((e, i) => (i === index ? { ...e, [field]: value } : e));
    const next = { ...personaData, entries: nextEntries };
    setPersonaData(next);
    persist(next);
  };

  const addRow = () => {
    const next = { ...personaData, entries: [...entries, { key: "", value: "" }] };
    setPersonaData(next);
    persist(next);
  };

  const toggleEntry = (i: number) => {
    setClosedEntries((s) => {
      const next = new Set(s);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const isEntryOpen = (i: number) => !closedEntries.has(i);

  const removeRow = (i: number) => {
    setClosedEntries((s) => {
      const next = new Set<number>();
      s.forEach((j) => {
        if (j < i) next.add(j);
        else if (j > i) next.add(j - 1);
      });
      return next;
    });
    const nextEntries = entries.filter((_, idx) => idx !== i);
    const next = { ...personaData, entries: nextEntries };
    setPersonaData(next);
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

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {/* 固定URL項目 */}
        <div className="space-y-2">
          <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest mb-1.5">基本情報</p>
          <div>
            <label className="block text-[9px] font-medium text-stone-500 mb-0.5">会社名</label>
            <input
              type="text"
              value={personaData.companyName ?? ""}
              onChange={(e) => updateFixedField("companyName", e.target.value)}
              placeholder="株式会社〇〇"
              className="w-full text-[11px] text-stone-700 border border-stone-200 rounded-md px-2 py-1.5 outline-none focus:border-orange-400 bg-white"
            />
          </div>
          <div>
            <label className="block text-[9px] font-medium text-stone-500 mb-0.5">HP</label>
            <input
              type="url"
              value={personaData.hp ?? ""}
              onChange={(e) => updateFixedField("hp", e.target.value)}
              placeholder="https://example.com"
              className="w-full text-[11px] text-stone-700 border border-stone-200 rounded-md px-2 py-1.5 outline-none focus:border-orange-400 bg-white"
            />
          </div>
          <div>
            <label className="block text-[9px] font-medium text-stone-500 mb-0.5">Googleマップ</label>
            <input
              type="url"
              value={personaData.googleMaps ?? ""}
              onChange={(e) => updateFixedField("googleMaps", e.target.value)}
              placeholder="https://maps.google.com/..."
              className="w-full text-[11px] text-stone-700 border border-stone-200 rounded-md px-2 py-1.5 outline-none focus:border-orange-400 bg-white"
            />
          </div>
          <div>
            <label className="block text-[9px] font-medium text-stone-500 mb-0.5">SNSリンク</label>
            <input
              type="url"
              value={personaData.snsLinks ?? ""}
              onChange={(e) => updateFixedField("snsLinks", e.target.value)}
              placeholder="https://facebook.com/... など"
              className="w-full text-[11px] text-stone-700 border border-stone-200 rounded-md px-2 py-1.5 outline-none focus:border-orange-400 bg-white"
            />
          </div>
        </div>

        {/* 項目名・内容（動的追加）項目ごとにアコーディオン */}
        <div className="space-y-2">
          <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest mb-1.5">その他項目</p>
          {entries.length === 0 ? (
            <p className="text-[11px] text-stone-400 italic text-center py-2">
              「＋ 項目を追加」で自由に項目を作れます
            </p>
          ) : (
            entries.map((entry, i) => (
              <div key={i} className="border border-stone-200 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleEntry(i)}
                  className="w-full flex items-center justify-between gap-2 py-2 px-3 bg-stone-50 hover:bg-stone-100 transition-colors text-left group/btn"
                >
                  <span className="text-[11px] font-semibold text-stone-600 truncate flex-1 text-left">
                    {entry.key || "（項目名未入力）"}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); removeRow(i); }}
                      className="opacity-0 group-hover/btn:opacity-100 text-stone-300 hover:text-red-400 transition-opacity p-0.5"
                      title="削除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-stone-500 transition-transform ${isEntryOpen(i) ? "rotate-180" : ""}`}
                    />
                  </div>
                </button>
                {isEntryOpen(i) && (
                  <div className="px-3 pb-3 pt-1 space-y-2 border-t border-stone-100">
                    <div>
                      <label className="block text-[9px] font-medium text-stone-500 mb-0.5">項目名</label>
                      <input
                        type="text"
                        value={entry.key}
                        onChange={(e) => update(i, "key", e.target.value)}
                        placeholder="項目名"
                        className="w-full text-[11px] font-semibold text-stone-600 border border-stone-200 rounded-md px-2 py-1 outline-none focus:border-orange-400 bg-stone-50"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-medium text-stone-500 mb-0.5">内容</label>
                      <textarea
                        value={entry.value}
                        onChange={(e) => update(i, "value", e.target.value)}
                        placeholder="内容"
                        rows={2}
                        className="w-full text-[12px] text-stone-700 border border-stone-200 rounded-md px-2 py-1 outline-none focus:border-orange-400 resize-none bg-white leading-relaxed"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
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
