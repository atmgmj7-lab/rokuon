import Link from "next/link";
import { getTrashRecordings } from "@/src/actions/trash-actions";
import TrashClient from "@/src/components/trash/TrashClient";

export default async function TrashPage() {
  const items = await getTrashRecordings();

  return (
    <div className="min-h-screen bg-[#FDFCFB] py-12">
      <div className="container mx-auto p-8">
        <header className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl font-bold text-[#2D2B2A]">ゴミ箱</h1>
            <Link
              href="/recordings"
              className="inline-flex px-4 py-2.5 bg-white border border-stone-200 text-stone-600 rounded-lg font-medium hover:bg-stone-50 hover:text-stone-900 transition-colors"
            >
              ← 録音一覧へ
            </Link>
          </div>
          <p className="text-[#827F7B]">
            削除した録音はここに表示されます。復元するか、完全に削除するかを選択できます。
          </p>
        </header>

        <TrashClient items={items} />
      </div>
    </div>
  );
}
