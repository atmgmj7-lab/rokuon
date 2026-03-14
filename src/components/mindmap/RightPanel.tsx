"use client";
import { useEffect, useRef, useState } from "react";
import { Node } from "reactflow";
import { ChevronDown, MessageSquare, Plus, Sliders, Trash2, User, X } from "lucide-react";

// ── palette constants ───────────────────────────────────────────────────────
const ACCENT_COLORS = [
  "#78716C","#C2410C","#2563EB","#16A34A","#9333EA",
  "#D97706","#BE185D","#0E7490","#374151","#B45309",
];
const BG_COLORS = [
  "#FFFFFF","#F7F6F4","#FFF7ED","#EFF6FF","#F0FDF4",
  "#FAF5FF","#FEFCE8","#FFF1F2","#F0F9FF","#ECFDF5",
];
const FONT_COLORS = [
  "#1C1917","#374151","#78716C","#C2410C",
  "#2563EB","#16A34A","#9333EA","#D97706","#FFFFFF",
];
const FONT_SIZES: { label: string; value: number }[] = [
  { label: "S",  value: 10 },
  { label: "M",  value: 12 },
  { label: "L",  value: 14 },
  { label: "XL", value: 16 },
];
const BORDER_WIDTHS: { label: string; value: number }[] = [
  { label: "細", value: 1 },
  { label: "中", value: 2 },
  { label: "太", value: 3 },
];
const SHAPES = [
  { value: "rect",    label: "□ 四角" },
  { value: "rounded", label: "▢ 角丸" },
  { value: "bubble",  label: "💬 吹き出し" },
];

// ── exported types ──────────────────────────────────────────────────────────
export interface NodeStyleUpdates {
  bgColor?:     string;
  color?:       string;
  borderWidth?: number;
  fontSize?:    number;
  fontColor?:   string;
  nodeShape?:   string;
}

// ── persona types ───────────────────────────────────────────────────────────
interface KVEntry { key: string; value: string; }

interface PersonaData {
  companyName?: string;
  hp?: string;
  googleMaps?: string;
  snsLinks?: string;
  entries?: KVEntry[];
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

// ── section header helper ───────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest mb-1.5 mt-3 first:mt-0">
      {children}
    </p>
  );
}

// ── color swatch ─────────────────────────────────────────────────────────────
function Swatch({
  c, active, rounded = true, onClick,
}: { c: string; active: boolean; rounded?: boolean; onClick: () => void }) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      style={{
        backgroundColor: c,
        border: active ? "2px solid #374151" : "1px solid #D6D3D1",
        borderRadius: rounded ? "50%" : 3,
        width: 18, height: 18, flexShrink: 0,
      }}
      className="hover:scale-110 transition-transform"
    />
  );
}

// ── props ─────────────────────────────────────────────────────────────────────
interface Props {
  mapId:              string;
  initialPersonaData: string | null;
  selectedNode:       Node | null;
  onNodeStyleUpdate:  (nodeId: string, updates: NodeStyleUpdates) => void;
  onClose:            () => void;
}

type TabType = "persona" | "design";

// ── component ─────────────────────────────────────────────────────────────────
export default function RightPanel({
  mapId, initialPersonaData, selectedNode, onNodeStyleUpdate, onClose,
}: Props) {
  const [tab,         setTab]         = useState<TabType>("persona");
  const [saving,      setSaving]      = useState(false);
  const [personaData, setPersonaData] = useState<PersonaData>(() => parsePersonaData(initialPersonaData));
  const [closedEntries, setClosedEntries] = useState<Set<number>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const entries = personaData.entries ?? [];

  // Auto-switch to Design tab when a node gets selected
  useEffect(() => {
    if (selectedNode) setTab("design");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNode?.id]);

  // ── persona debounced save ──────────────────────────────────────────────
  const persistPersona = (next: PersonaData) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setSaving(true);
      fetch(`/api/mind-maps/${mapId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ persona_data: serializePersonaData(next) }),
      }).catch(() => {}).finally(() => setSaving(false));
    }, 1200);
  };

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const updateFixedField = (field: "companyName" | "hp" | "googleMaps" | "snsLinks", value: string) => {
    const next = { ...personaData, [field]: value };
    setPersonaData(next);
    persistPersona(next);
  };

  const updateEntry = (i: number, field: "key" | "value", value: string) => {
    const nextEntries = entries.map((e, idx) => idx === i ? { ...e, [field]: value } : e);
    const next = { ...personaData, entries: nextEntries };
    setPersonaData(next);
    persistPersona(next);
  };
  const addEntry = () => {
    const next = { ...personaData, entries: [...entries, { key: "", value: "" }] };
    setPersonaData(next);
    persistPersona(next);
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

  const removeEntry = (i: number) => {
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
    persistPersona(next);
  };

  // ── design tab values ───────────────────────────────────────────────────
  type AnyData = Record<string, unknown>;
  const d           = (selectedNode?.data as AnyData | null | undefined) ?? null;
  const currentBg   = (d?.bgColor     as string | undefined) ?? "#FFFFFF";
  const currentAcc  = (d?.color       as string | undefined) ?? "#78716C";
  const currentBw   = (d?.borderWidth as number | undefined) ?? 1;
  const currentFs   = (d?.fontSize    as number | undefined) ?? 12;
  const currentFc   = (d?.fontColor   as string | undefined) ?? "#374151";
  const currentSh   = (d?.nodeShape   as string | undefined) ?? "rounded";
  const isComment   = selectedNode?.type === "comment";

  const upd = (updates: NodeStyleUpdates) => {
    if (selectedNode) onNodeStyleUpdate(selectedNode.id, updates);
  };

  // ── render ──────────────────────────────────────────────────────────────
  return (
    <div className="w-64 h-full bg-white border-l border-stone-200 shadow-md flex flex-col shrink-0">

      {/* Header + tabs */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-stone-100">
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setTab("persona")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
              tab === "persona" ? "bg-stone-100 text-stone-800" : "text-stone-400 hover:text-stone-600"
            }`}
          >
            <User className="w-3 h-3" /> ペルソナ
          </button>
          <button
            onClick={() => setTab("design")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
              tab === "design" ? "bg-stone-100 text-stone-800" : "text-stone-400 hover:text-stone-600"
            }`}
          >
            <Sliders className="w-3 h-3" /> デザイン
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          {saving && <span className="text-[9px] text-stone-400">保存中...</span>}
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Persona tab ─────────────────────────────────────────────────── */}
      {tab === "persona" && (
        <>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {/* 固定URL項目 */}
            <div className="space-y-2">
              <SectionLabel>基本情報</SectionLabel>
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
              <SectionLabel>その他項目</SectionLabel>
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
                          onClick={(e) => { e.stopPropagation(); removeEntry(i); }}
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
                            onChange={(e) => updateEntry(i, "key", e.target.value)}
                            placeholder="項目名"
                            className="w-full text-[11px] font-semibold text-stone-600 border border-stone-200 rounded-md px-2 py-1 outline-none focus:border-orange-400 bg-stone-50"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-medium text-stone-500 mb-0.5">内容</label>
                          <textarea
                            value={entry.value}
                            onChange={(e) => updateEntry(i, "value", e.target.value)}
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

          <div className="px-4 pb-3">
            <button
              onClick={addEntry}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-stone-300 text-[11px] text-stone-500 hover:border-orange-400 hover:text-orange-500 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> 項目を追加
            </button>
          </div>

          <div className="px-4 py-2 border-t border-stone-100">
            <p className="text-[10px] text-stone-400">入力内容は自動で保存されます</p>
          </div>
        </>
      )}

      {/* ── Design tab ──────────────────────────────────────────────────── */}
      {tab === "design" && (
        !selectedNode ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-stone-400">
            <MessageSquare className="w-6 h-6 opacity-40" />
            <p className="text-[11px]">ノードを選択してください</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-4 py-3">

            {/* Node type badge */}
            <div className="mb-3">
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-stone-500 bg-stone-100 rounded-md px-2 py-0.5">
                {selectedNode.type === "scriptItem" ? "スクリプトノード"
                  : selectedNode.type === "comment" ? "コメントノード"
                  : "テキストノード"}
              </span>
            </div>

            {/* FILL */}
            <SectionLabel>塗り</SectionLabel>
            <div className="flex flex-wrap gap-1.5 mb-1">
              {BG_COLORS.map((c) => (
                <Swatch key={c} c={c} active={currentBg === c} rounded={false} onClick={() => upd({ bgColor: c })} />
              ))}
            </div>

            {/* STROKE */}
            <SectionLabel>枠線</SectionLabel>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {ACCENT_COLORS.map((c) => (
                <Swatch key={c} c={c} active={currentAcc === c} onClick={() => upd({ color: c })} />
              ))}
            </div>
            <div className="flex gap-1">
              {BORDER_WIDTHS.map(({ label, value }) => (
                <button key={value}
                  onMouseDown={(e) => { e.preventDefault(); upd({ borderWidth: value }); }}
                  className={`flex-1 py-1 text-[10px] rounded-md font-medium transition-colors ${
                    currentBw === value ? "bg-stone-700 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                  }`}
                >{label}</button>
              ))}
            </div>

            {/* TYPOGRAPHY */}
            <SectionLabel>文字サイズ</SectionLabel>
            <div className="flex gap-1 mb-2">
              {FONT_SIZES.map(({ label, value }) => (
                <button key={value}
                  onMouseDown={(e) => { e.preventDefault(); upd({ fontSize: value }); }}
                  className={`flex-1 py-1 text-[10px] rounded-md font-medium transition-colors ${
                    currentFs === value ? "bg-stone-700 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                  }`}
                >{label}</button>
              ))}
            </div>

            <SectionLabel>文字色</SectionLabel>
            <div className="flex flex-wrap gap-1.5">
              {FONT_COLORS.map((c) => (
                <Swatch key={c} c={c} active={currentFc === c} onClick={() => upd({ fontColor: c })} />
              ))}
            </div>

            {/* SHAPE — comment nodes only */}
            {isComment && (
              <>
                <SectionLabel>形状</SectionLabel>
                <div className="flex flex-col gap-1">
                  {SHAPES.map(({ value, label }) => (
                    <button key={value}
                      onMouseDown={(e) => { e.preventDefault(); upd({ nodeShape: value }); }}
                      className={`w-full py-1.5 text-[10px] rounded-md font-medium text-left px-2.5 transition-colors ${
                        currentSh === value ? "bg-stone-700 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                      }`}
                    >{label}</button>
                  ))}
                </div>
              </>
            )}
          </div>
        )
      )}
    </div>
  );
}
