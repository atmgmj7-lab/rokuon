"use client";

import { useState, useEffect } from "react";
import { getTranscriptCorrections } from "@/src/actions/correction-actions";
import type { TranscriptCorrection } from "@/src/actions/correction-actions";
import Link from "next/link";

function formatDate(timestamp: number): string {
  const d = new Date(timestamp);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}/${m}/${day}`;
}

export default function LearningDataManager() {
  const [corrections, setCorrections] = useState<TranscriptCorrection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await getTranscriptCorrections();
      setCorrections(data);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] p-12">
        <div className="flex items-center justify-center gap-2 text-[#827F7B]">
          <div className="animate-spin h-5 w-5 border-2 border-stone-400 border-t-transparent rounded-full" />
          <span>読み込み中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-stone-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-[#2D2B2A]">学習データ（修正履歴）</h2>
        <Link
          href="/recordings"
          className="px-3 py-1.5 bg-white border border-stone-200 text-stone-600 rounded-lg font-medium hover:bg-stone-50 hover:text-stone-900 transition-colors text-sm"
        >
          録音一覧へ
        </Link>
      </div>

      {corrections.length === 0 ? (
        <div className="text-center py-16 px-6">
          <p className="text-[#827F7B] leading-relaxed max-w-md mx-auto">
            まだ修正履歴がありません。文字起こし画面で「編集」を行うと、ここにAIの学習データが蓄積されます。
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {corrections.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-4 p-4 rounded-xl border border-stone-200/80 bg-stone-50/30 hover:bg-stone-50/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-[#9E9A95] line-through text-sm">
                    {item.original_text}
                  </span>
                  <span className="text-stone-400 text-sm shrink-0">→</span>
                  <span className="font-bold text-[#2D2B2A]">
                    {item.corrected_text}
                  </span>
                </div>
              </div>
              <span className="text-xs text-[#9E9A95] shrink-0 whitespace-nowrap">
                {formatDate(item.created_at)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
