import { searchRecordings, getChildrenForParentIds, getRecordingsCount } from "@/src/actions/recording-actions";
import { getAllAudioCategories } from "@/src/actions/audio-category-actions";
import { getCurrentUser } from "@/src/actions/auth-actions";
import Link from "next/link";
import RecordingCard from "@/src/components/recording/RecordingCard";
import RecordingsSearchBar from "@/src/components/recording/RecordingsSearchBar";
import AudioCategoryManager from "@/src/components/recording/AudioCategoryManager";
import RecordingsLoadMore from "@/src/components/recording/RecordingsLoadMore";
import { Suspense } from "react";

const PAGE_SIZE = 20;

export const revalidate = 60;

export default async function RecordingsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; acat?: string; page?: string }>;
}) {
  const params = await searchParams;
  const searchQuery = (params.q ?? "").trim();
  const audioCategoryId = (params.acat ?? "").trim();
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const [parentRecordings, totalCount, audioCategories, user] = await Promise.all([
    searchRecordings(searchQuery || undefined, undefined, audioCategoryId || undefined, PAGE_SIZE, offset),
    getRecordingsCount(searchQuery || undefined, audioCategoryId || undefined),
    getAllAudioCategories(),
    getCurrentUser(),
  ]);
  const canEdit = user?.role === "admin";

  const children =
    parentRecordings.length > 0
      ? await getChildrenForParentIds(parentRecordings.map((r) => r.id))
      : [];

  const filteredParentIds = new Set(parentRecordings.map((r) => r.id));
  const childrenMap = new Map<string, typeof children>();
  children
    .filter((r) => r.parent_id && filteredParentIds.has(r.parent_id))
    .forEach((child) => {
      if (!childrenMap.has(child.parent_id!)) {
        childrenMap.set(child.parent_id!, []);
      }
      childrenMap.get(child.parent_id!)!.push(child);
    });

  const hasRecordings = totalCount > 0;
  const hasFilteredResults = parentRecordings.length > 0;

  return (
    <div className="min-h-screen bg-[#FDFCFB] py-12">
      <div className="container mx-auto p-8">
        <header className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl font-bold text-[#2D2B2A]">録音一覧</h1>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/trash"
                className="inline-flex items-center gap-1 px-5 py-2.5 bg-white border border-stone-200 text-stone-600 rounded-lg font-medium hover:bg-stone-50 hover:text-stone-900 transition-colors"
              >
                ゴミ箱
              </Link>
              <Link
                href="/recordings/dictionary"
                className="inline-flex items-center gap-1 px-5 py-2.5 bg-white border border-stone-200 text-stone-600 rounded-lg font-medium hover:bg-stone-50 hover:text-stone-900 transition-colors"
              >
                ユーザー辞書
              </Link>
              <Link
                href="/"
                className="inline-flex items-center px-4 py-2.5 bg-white border border-stone-200 text-stone-600 rounded-lg font-medium hover:bg-stone-50 hover:text-stone-900 transition-colors"
              >
                ← ホームへ
              </Link>
            </div>
          </div>
          <p className="text-[#827F7B] mb-6">
            アップロードされた録音データをIDで管理。課題音声に対してフィードバック音声を紐付けできます
          </p>

          {/* 検索・カテゴリフィルター */}
          {hasRecordings && (
            <Suspense
              fallback={
                <div className="h-20 bg-white/50 rounded-lg border border-stone-200 animate-pulse" />
              }
            >
              <div className="space-y-4">
                <RecordingsSearchBar
                  audioCategories={audioCategories}
                  initialQuery={searchQuery}
                  initialAudioCategoryId={audioCategoryId}
                />
                {canEdit && <AudioCategoryManager categories={audioCategories} />}
              </div>
            </Suspense>
          )}
        </header>

        {!hasRecordings ? (
          <div className="bg-white rounded-2xl border border-stone-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] p-12 text-center">
            <p className="text-[#827F7B] mb-6">まだ録音データがありません</p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-white border border-stone-200 text-stone-600 rounded-lg font-medium hover:bg-stone-50 hover:text-stone-900 transition-colors"
            >
              音声をアップロード
            </Link>
          </div>
        ) : !hasFilteredResults ? (
          <div className="bg-white rounded-2xl border border-stone-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] p-12 text-center">
            <p className="text-[#827F7B] mb-6">
              検索条件に一致する録音がありません
            </p>
            <Link
              href="/recordings"
              className="inline-block px-6 py-3 bg-white border border-stone-200 text-stone-600 rounded-lg font-medium hover:bg-stone-50 hover:text-stone-900 transition-colors"
            >
              フィルターを解除
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-6">
              {parentRecordings.map((recording) => {
                const childList = childrenMap.get(recording.id) || [];
                return (
                  <RecordingCard
                    key={recording.id}
                    recording={recording}
                    children={childList}
                    audioCategories={audioCategories}
                    canEdit={canEdit}
                  />
                );
              })}
            </div>
            <RecordingsLoadMore
              currentPage={page}
              totalCount={totalCount}
              pageSize={PAGE_SIZE}
              searchQuery={searchQuery}
              audioCategoryId={audioCategoryId}
            />
          </>
        )}
      </div>
    </div>
  );
}
