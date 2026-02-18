import { getAllRecordings } from "@/src/actions/recording-actions";
import Link from "next/link";
import RecordingCard from "@/src/components/recording/RecordingCard";

export default async function RecordingsPage() {
  const recordings = await getAllRecordings();

  // 親録音（課題音声とお手本）のみを抽出
  const parentRecordings = recordings.filter((r) => !r.parent_id);

  // 子録音（指導音声）をマッピング
  const childrenMap = new Map<string, typeof recordings>();
  recordings
    .filter((r) => r.parent_id)
    .forEach((child) => {
      if (!childrenMap.has(child.parent_id!)) {
        childrenMap.set(child.parent_id!, []);
      }
      childrenMap.get(child.parent_id!)!.push(child);
    });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
      <div className="container mx-auto px-4">
        <header className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl font-bold text-gray-800">📼 録音一覧</h1>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/recordings/dictionary"
                className="inline-flex items-center gap-1 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-medium shadow-md transition-all"
              >
                📖 ユーザー辞書
              </Link>
              <Link
                href="/"
                className="inline-flex items-center px-4 py-2.5 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors"
              >
                ← ホームへ
              </Link>
            </div>
          </div>
          <p className="text-gray-600">
            アップロードされた録音データをIDで管理。課題音声に対してフィードバック音声を紐付けできます
          </p>
        </header>

        {parentRecordings.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <p className="text-gray-500 mb-6">まだ録音データがありません</p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-md"
            >
              ➕ 音声をアップロード
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {parentRecordings.map((recording) => {
              const children = childrenMap.get(recording.id) || [];
              return (
                <RecordingCard
                  key={recording.id}
                  recording={recording}
                  children={children}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
