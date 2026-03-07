"use client";
import { useEffect, useState } from "react";

interface ScriptItem {
  id: string;
  title: string;
  content: string;
  folder_name: string;
  category_name: string;
}

interface Props {
  onAdd: (item: ScriptItem) => void;
  onClose: () => void;
}

export default function ScriptItemPanel({ onAdd, onClose }: Props) {
  const [items, setItems]   = useState<ScriptItem[]>([]);
  const [query, setQuery]   = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/workspace/items")
      .then((r) => r.json())
      .then((j: { success: boolean; data: ScriptItem[] }) => {
        if (j.success) setItems(j.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = query
    ? items.filter(
        (i) =>
          i.title.includes(query) ||
          i.content.includes(query) ||
          i.category_name.includes(query)
      )
    : items;

  // カテゴリでグループ化
  const grouped = filtered.reduce<Record<string, ScriptItem[]>>((acc, item) => {
    const key = item.category_name || "未分類";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <div className="w-72 h-full bg-white border-l border-stone-200 flex flex-col shadow-xl z-10">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200 bg-stone-50">
        <span className="text-sm font-bold text-stone-700">スクリプトから追加</span>
        <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-lg leading-none">✕</button>
      </div>

      {/* 検索 */}
      <div className="px-3 py-2 border-b border-stone-100">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="タイトル・内容で絞り込み"
          className="w-full px-2 py-1.5 text-xs border border-stone-200 rounded-lg outline-none focus:border-blue-400"
        />
      </div>

      {/* リスト */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <p className="text-center text-xs text-stone-400 mt-8">読み込み中...</p>
        ) : Object.keys(grouped).length === 0 ? (
          <p className="text-center text-xs text-stone-400 mt-8">該当なし</p>
        ) : (
          Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <div className="px-3 py-1.5 text-[10px] font-bold text-stone-400 uppercase tracking-wide bg-stone-50 sticky top-0">
                {category}
              </div>
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onAdd(item)}
                  className="w-full text-left px-3 py-2.5 border-b border-stone-100 hover:bg-blue-50 transition-colors"
                >
                  <p className="text-xs font-semibold text-stone-700 truncate">{item.title}</p>
                  <p className="text-[11px] text-stone-400 truncate mt-0.5">{item.content}</p>
                </button>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
