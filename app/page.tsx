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
            {/* V2版（最新・完全カスタマイズ対応） */}
            <Link
              href="/call-v2"
              className="px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white rounded-lg font-bold transition-colors shadow-lg hover:shadow-xl animate-pulse ring-4 ring-orange-300"
            >
              📞 コール画面 V2 🆕
            </Link>
            <Link
              href="/workspace-v2"
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg font-bold transition-colors shadow-lg hover:shadow-xl ring-4 ring-indigo-300"
            >
              🛠️ ワークスペース V2 🆕
            </Link>

            {/* V1版（従来版） */}
            <Link
              href="/call"
              className="px-6 py-3 bg-gradient-to-r from-orange-400 to-red-400 hover:from-orange-500 hover:to-red-500 text-white rounded-lg font-medium transition-colors shadow-md hover:shadow-lg opacity-75"
            >
              📞 コール画面 V1
            </Link>
            <Link
              href="/workspace"
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-lg font-medium transition-colors shadow-md hover:shadow-lg opacity-75"
            >
              📁 ワークスペース V1
            </Link>

            {/* その他の機能 */}
            <Link
              href="/scripts"
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors shadow-md hover:shadow-lg"
            >
              📞 トークスクリプト
            </Link>
            <Link
              href="/recordings"
              className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors shadow-md hover:shadow-lg"
            >
              📼 録音一覧
            </Link>
            <Link
              href="/knowledge"
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors shadow-md hover:shadow-lg"
            >
              📚 ナレッジベース
            </Link>
          </div>
        </header>
        
        <main>
          <AudioUploader />
        </main>
      </div>
    </div>
  );
}
