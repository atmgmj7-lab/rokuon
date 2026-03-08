"use client";
import { useEffect, useState, useRef } from "react";
import { X, User } from "lucide-react";

export interface PersonaData {
  industry:     string;
  role:         string;
  company_size: string;
  network:      string;
  device:       string;
  pain:         string;
  personality:  string;
  barrier:      string;
  goal:         string;
}

const EMPTY: PersonaData = {
  industry: "", role: "", company_size: "",
  network: "", device: "",
  pain: "", personality: "", barrier: "",
  goal: "",
};

interface Props {
  mapId: string;
  initialData: string | null;
  onClose: () => void;
}

export default function PersonaPanel({ mapId, initialData, onClose }: Props) {
  const [data, setData] = useState<PersonaData>(() => {
    if (!initialData) return EMPTY;
    try { return { ...EMPTY, ...(JSON.parse(initialData) as Partial<PersonaData>) }; }
    catch { return EMPTY; }
  });
  const [saving, setSaving] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const update = (field: keyof PersonaData, value: string) => {
    setData((prev) => {
      const next = { ...prev, [field]: value };
      // debounced save
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
      return next;
    });
  };

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const Field = ({
    label, field, rows = 1, placeholder,
  }: { label: string; field: keyof PersonaData; rows?: number; placeholder?: string }) => (
    <div>
      <label className="block text-[10px] font-bold text-stone-500 mb-1 uppercase tracking-wide">{label}</label>
      {rows > 1 ? (
        <textarea
          value={data[field]}
          onChange={(e) => update(field, e.target.value)}
          rows={rows}
          placeholder={placeholder}
          className="w-full text-[12px] text-stone-700 border border-stone-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-orange-400 resize-none bg-white leading-relaxed"
        />
      ) : (
        <input
          type="text"
          value={data[field]}
          onChange={(e) => update(field, e.target.value)}
          placeholder={placeholder}
          className="w-full text-[12px] text-stone-700 border border-stone-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-orange-400 bg-white"
        />
      )}
    </div>
  );

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

      {/* Fields */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {/* 基本属性 */}
        <div>
          <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mb-2">基本属性</p>
          <div className="space-y-2">
            <Field label="業種" field="industry" placeholder="例：製造業、IT、不動産" />
            <Field label="役職" field="role" placeholder="例：経営者、営業部長" />
            <Field label="会社規模" field="company_size" placeholder="例：従業員50〜100名" />
          </div>
        </div>

        {/* インフラ */}
        <div>
          <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mb-2">インフラ状況</p>
          <div className="space-y-2">
            <Field label="ネット状況" field="network" placeholder="例：光回線、在宅ワーク多め" />
            <Field label="使用デバイス" field="device" placeholder="例：MacBook, iPhone" />
          </div>
        </div>

        {/* 心理属性 */}
        <div>
          <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mb-2">心理属性</p>
          <div className="space-y-2">
            <Field label="主要な悩み" field="pain" rows={2} placeholder="例：採用コストが高い、生産性が低い" />
            <Field label="性格・トーン" field="personality" placeholder="例：論理的、慎重派" />
            <Field label="導入の壁" field="barrier" rows={2} placeholder="例：コスト懸念、社内稟議が必要" />
          </div>
        </div>

        {/* ゴール */}
        <div>
          <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mb-2">このマップのゴール</p>
          <Field label="目標" field="goal" rows={2} placeholder="例：アポ取得、キーマン特定、ニーズ確認" />
        </div>
      </div>

      {/* Footer hint */}
      <div className="px-4 py-2 border-t border-stone-100">
        <p className="text-[10px] text-stone-400">入力内容は自動で保存されます</p>
      </div>
    </div>
  );
}
