import AudioUploader from "@/src/components/recording/AudioUploader";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
      <div className="container mx-auto px-4">
        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 text-gray-800">
            🎙️ Rokuon
          </h1>
          <p className="text-xl text-gray-600 mb-6">
            テレアポ音声を自動文字起こし
          </p>

          {/* 機能メニュー */}
          <div className="flex gap-4 justify-center mb-8 flex-wrap">
            {/* メイン機能（推奨） */}
            <Link
              href="/call-v3"
              className="px-8 py-4 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white rounded-xl font-bold transition-colors shadow-xl hover:shadow-2xl animate-pulse ring-4 ring-orange-300 scale-110"
            >
              📞 コール画面 🔥
            </Link>
            <Link
              href="/workspace"
              className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold transition-colors shadow-xl hover:shadow-2xl ring-4 ring-indigo-300 scale-110"
            >
              🛠️ ワークスペース
            </Link>

            {/* サブ機能 */}
            <Link
              href="/workspace-v2"
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-lg font-medium transition-colors shadow-md hover:shadow-lg"
            >
              🔧 詳細設定（V2）
            </Link>

          </div>

          {/* 説明 */}
          <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4">💡 使い方</h2>
            <div className="space-y-3 text-sm text-gray-700">
              <p><strong>🛠️ ワークスペース:</strong> 基本シナリオと部品トークを作成・編集します。状況タグやチェック項目への紐付けも設定できます。</p>
              <p><strong>📞 コール画面:</strong> 実戦で使用します。基本シナリオから開始し、チェック項目をONにすると部品トークが動的に追加されます。</p>
              <p><strong>🔧 詳細設定:</strong> 状況タグ、カテゴリ、チェック項目などを管理します。</p>
            </div>
          </div>
        </header>
        
        <main>
          <AudioUploader />
        </main>
      </div>
    </div>
  );
}
