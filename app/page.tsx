import AudioUploader from "@/src/components/recording/AudioUploader";
import Link from "next/link";
import StrategyBanner from "@/src/components/recording/StrategyBanner";
import { getCurrentUser } from "@/src/actions/auth-actions";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ company?: string; url?: string; strategy?: string }>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const canEdit = user?.role === "admin";
  const company = (params.company ?? "").trim();
  const url = (params.url ?? "").trim();
  const strategy = (params.strategy ?? "").trim();

  return (
    <div className="min-h-screen bg-[#FDFCFB] py-12">
      <div className="container mx-auto p-8">
        {(company || url || strategy) && (
          <StrategyBanner company={company} url={url} strategy={strategy} />
        )}
        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 text-[#2D2B2A]">
            Recode
          </h1>
          <p className="text-xs text-stone-400 mb-2">v2.0-fetch-mode</p>
          <p className="text-xl text-[#827F7B] mb-6">
            テレアポ音声を自動文字起こし
          </p>

          {/* 機能メニュー */}
          <div className="flex gap-4 justify-center mb-8 flex-wrap">
            <Link
              href="/call"
              className="px-10 py-6 bg-[#C87A55] hover:bg-[#B56A45] text-white rounded-2xl font-bold text-lg transition-all shadow-paper-md"
            >
              コール画面
            </Link>
            <Link
              href="/workspace"
              className="px-10 py-6 bg-[#C87A55] hover:bg-[#B56A45] text-white rounded-2xl font-bold text-lg transition-all shadow-paper-md"
            >
              ワークスペース
            </Link>
            <Link
              href="/recordings"
              className="px-10 py-6 bg-[#C87A55] hover:bg-[#B56A45] text-white rounded-2xl font-bold text-lg transition-all shadow-paper-md"
            >
              録音履歴
            </Link>
            <Link
              href="/trash"
              className="px-10 py-6 bg-white border-2 border-stone-200 text-stone-600 hover:bg-stone-50 rounded-2xl font-bold text-lg transition-all shadow-paper-md"
            >
              ゴミ箱
            </Link>
          </div>

          {/* 録音機能（admin のみアップロード可能） */}
          <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-stone-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] p-6 mb-8">
            <h2 className="text-xl font-bold text-[#2D2B2A] mb-4">音声アップロード</h2>
            <p className="text-sm text-[#827F7B] mb-4">
              {canEdit
                ? "テレアポ音声をアップロードして自動文字起こしを行います"
                : "閲覧のみ可能です。アップロードは管理者にご依頼ください。"}
            </p>
            {canEdit && <AudioUploader />}

            {/* 履歴を見るボタン */}
            <div className="mt-6 pt-6 border-t border-stone-200/60">
              <Link
                href="/recordings"
                className="flex items-center justify-center gap-3 w-full px-6 py-4 bg-[#C87A55] hover:bg-[#B56A45] text-white rounded-xl font-bold transition-all"
              >
                履歴を見る
              </Link>
              <p className="text-xs text-[#827F7B] mt-2 text-center">
                録音一覧・ID管理・フィードバック音声の紐付け
              </p>
            </div>
          </div>
        </header>
      </div>
    </div>
  );
}
