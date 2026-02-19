"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useEffect } from "react";
import type { AudioCategory } from "@/src/actions/audio-category-actions";

interface RecordingsSearchBarProps {
  audioCategories: AudioCategory[];
  initialQuery?: string;
  initialAudioCategoryId?: string;
}

export default function RecordingsSearchBar({
  audioCategories,
  initialQuery = "",
  initialAudioCategoryId = "",
}: RecordingsSearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const applyFilters = useCallback(
    (q: string, acatId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (q.trim()) params.set("q", q.trim());
      else params.delete("q");
      if (acatId) params.set("acat", acatId);
      else params.delete("acat");
      router.push(`/recordings${params.toString() ? `?${params.toString()}` : ""}`);
    },
    [router, searchParams]
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters(query, initialAudioCategoryId);
  };

  const handleAudioCategoryClick = (acatId: string) => {
    const newAcat = initialAudioCategoryId === acatId ? "" : acatId;
    applyFilters(query, newAcat);
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

      {/* 音声カテゴリフィルター */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-[#827F7B]">音声カテゴリ:</span>
        <button
          type="button"
          onClick={() => handleAudioCategoryClick("")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
            !initialAudioCategoryId
              ? "bg-[#C87A55] text-white shadow-sm shadow-stone-200/50"
              : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50 hover:text-stone-900"
          }`}
        >
          すべて
        </button>
        {audioCategories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => handleAudioCategoryClick(cat.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
              initialAudioCategoryId === cat.id
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
    </div>
  );
}
