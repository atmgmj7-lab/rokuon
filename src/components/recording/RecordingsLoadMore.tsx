"use client";

import Link from "next/link";

interface RecordingsLoadMoreProps {
  currentPage: number;
  totalCount: number;
  pageSize: number;
  searchQuery: string;
  audioCategoryId: string;
}

function buildHref(page: number, searchQuery: string, audioCategoryId: string): string {
  const params = new URLSearchParams();
  if (searchQuery) params.set("q", searchQuery);
  if (audioCategoryId) params.set("acat", audioCategoryId);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return `/recordings${qs ? `?${qs}` : ""}`;
}

export default function RecordingsLoadMore({
  currentPage,
  totalCount,
  pageSize,
  searchQuery,
  audioCategoryId,
}: RecordingsLoadMoreProps) {
  const loadedCount = currentPage * pageSize;
  const hasMore = loadedCount < totalCount;
  const hasPrev = currentPage > 1;

  if (!hasMore && !hasPrev) return null;

  return (
    <div className="mt-8 flex justify-center gap-4 flex-wrap">
      {hasPrev && (
        <Link
          href={buildHref(currentPage - 1, searchQuery, audioCategoryId)}
          className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-stone-200 text-stone-600 rounded-xl font-medium hover:bg-stone-50 hover:text-stone-900 transition-colors"
        >
          ← 前のページ
        </Link>
      )}
      {hasMore && (
        <Link
          href={buildHref(currentPage + 1, searchQuery, audioCategoryId)}
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#C87A55] hover:bg-[#B56A45] text-white rounded-xl font-medium transition-colors"
        >
          さらに読み込む（{loadedCount} / {totalCount}件）
        </Link>
      )}
    </div>
  );
}
