"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useEffect } from "react";
import type { RecordingCategory } from "@/src/actions/category-actions";
import { AUDIO_CATEGORY_OPTIONS } from "@/src/lib/recording-constants";

interface RecordingsSearchBarProps {
  categories: RecordingCategory[];
  initialQuery?: string;
  initialCategoryId?: string;
  initialAudioCategory?: string;
}

export default function RecordingsSearchBar({
  categories,
  initialQuery = "",
  initialCategoryId = "",
  initialAudioCategory = "",
}: RecordingsSearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const applyFilters = useCallback(
    (q: string, catId: string, acat: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (q.trim()) params.set("q", q.trim());
      else params.delete("q");
      if (catId) params.set("cat", catId);
      else params.delete("cat");
      if (acat) params.set("acat", acat);
      else params.delete("acat");
      router.push(`/recordings${params.toString() ? `?${params.toString()}` : ""}`);
    },
    [router, searchParams]
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters(query, initialCategoryId, initialAudioCategory);
  };

  const handleCategoryClick = (catId: string) => {
    const newCat = initialCategoryId === catId ? "" : catId;
    applyFilters(query, newCat, initialAudioCategory);
  };

  const handleAudioCategoryClick = (acat: string) => {
    const newAcat = initialAudioCategory === acat ? "" : acat;
    applyFilters(query, initialCategoryId, newAcat);
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearchSubmit} className="w-full max-w-xl">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="タイトル・メモ・文字起こしで検索..."
            className="flex-1 px-4 py-2.5 bg-white border border-stone-200 rounded-lg text-[#2D2B2A] placeholder:text-[#9E9A95] focus:ring-2 focus:ring-stone-300 focus:border-stone-300 transition-all"
          />
          <button
            type="submit"
            className="px-5 py-2.5 bg-white border border-stone-200 text-stone-600 rounded-lg font-medium hover:bg-stone-50 hover:text-stone-900 transition-colors"
          >
            検索
          </button>
        </div>
      </form>

      {categories.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-[#827F7B]">ワークスペースカテゴリ:</span>
          <button
            type="button"
            onClick={() => handleCategoryClick("")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              !initialCategoryId
                ? "bg-[#C87A55] text-white shadow-sm shadow-stone-200/50"
                : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50 hover:text-stone-900"
            }`}
          >
            すべて
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleCategoryClick(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
                initialCategoryId === cat.id
                  ? "bg-[#C87A55] text-white shadow-sm shadow-stone-200/50"
                  : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50 hover:text-stone-900"
              }`}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: cat.color }}
              />
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* 音声種類フィルター（ワークスペースカテゴリとは別） */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-[#827F7B]">音声種類:</span>
        <button
          type="button"
          onClick={() => handleAudioCategoryClick("")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
            !initialAudioCategory
              ? "bg-[#C87A55] text-white shadow-sm shadow-stone-200/50"
              : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50 hover:text-stone-900"
          }`}
        >
          すべて
        </button>
        {AUDIO_CATEGORY_OPTIONS.filter((o) => o.value).map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleAudioCategoryClick(opt.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              initialAudioCategory === opt.value
                ? "bg-[#C87A55] text-white shadow-sm shadow-stone-200/50"
                : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50 hover:text-stone-900"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
