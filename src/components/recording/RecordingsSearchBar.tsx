"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useEffect } from "react";

interface RecordingsSearchBarProps {
  categories: string[];
  initialQuery?: string;
  initialCategory?: string;
}

export default function RecordingsSearchBar({
  categories,
  initialQuery = "",
  initialCategory = "",
}: RecordingsSearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const applyFilters = useCallback(
    (q: string, cat: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (q.trim()) params.set("q", q.trim());
      else params.delete("q");
      if (cat) params.set("cat", cat);
      else params.delete("cat");
      router.push(`/recordings${params.toString() ? `?${params.toString()}` : ""}`);
    },
    [router, searchParams]
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters(query, initialCategory);
  };

  const handleCategoryClick = (cat: string) => {
    const newCat = initialCategory === cat ? "" : cat;
    applyFilters(query, newCat);
  };

  return (
    <div className="space-y-4">
      {/* 検索バー */}
      <form onSubmit={handleSearchSubmit} className="w-full max-w-xl">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="タイトル・メモで検索..."
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

      {/* カテゴリフィルター（バッジ） */}
      {categories.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-[#827F7B]">カテゴリ:</span>
          <button
            type="button"
            onClick={() => handleCategoryClick("")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              !initialCategory
                ? "bg-[#C87A55] text-white shadow-sm shadow-stone-200/50"
                : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50 hover:text-stone-900"
            }`}
          >
            すべて
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => handleCategoryClick(cat)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                initialCategory === cat
                  ? "bg-[#C87A55] text-white shadow-sm shadow-stone-200/50"
                  : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50 hover:text-stone-900"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
