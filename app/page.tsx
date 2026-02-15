import AudioUploader from "@/src/components/recording/AudioUploader";
import RecordingList from "@/src/components/recording/RecordingList";
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
              href="/call"
              className="px-10 py-6 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white rounded-2xl font-bold text-lg transition-all shadow-2xl hover:shadow-3xl animate-pulse ring-4 ring-orange-300 transform hover:scale-105"
            >
              📞 コール画面
            </Link>
            <Link
              href="/workspace"
              className="px-10 py-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-2xl font-bold text-lg transition-all shadow-2xl hover:shadow-3xl ring-4 ring-indigo-300 transform hover:scale-105"
            >
              🛠️ ワークスペース
            </Link>
          </div>

          {/* 説明 */}
          <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4">💡 使い方</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🛠️</span>
                <div>
                  <h3 className="font-bold text-gray-800 mb-1">ワークスペース（統合版）</h3>
                  <p className="text-sm text-gray-700">
                    <strong>6つのメニュー</strong>ですべてを管理：基本シナリオ、部品トーク、組み合わせトーク、状況タグ、チェック項目、カテゴリ。
                    iPhoneライクな直感的UIで削除・追加が簡単。変更は明示的な<strong>保存ボタン</strong>で確定。
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl">📞</span>
                <div>
                  <h3 className="font-bold text-gray-800 mb-1">コール画面（実戦コックピット）</h3>
                  <p className="text-sm text-gray-700">
                    <strong>基本シナリオ</strong>からスタート。会話を進めながら<strong>チェック項目をON</strong> → 部品トークが<strong>動的に追加</strong>（アニメーション付き）。
                    状況タブの切り替えで、フェーズに応じたトークセットに変更。右下の<strong>Quick Response</strong>で想定外の質問に即対応。
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 録音機能 */}
          <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4">🎙️ 音声アップロード</h2>
            <p className="text-sm text-gray-600 mb-4">
              テレアポ音声をアップロードして自動文字起こしを行います
            </p>
            <AudioUploader />
          </div>
        </header>

        {/* 録音履歴 */}
        <main className="max-w-5xl mx-auto">
          <RecordingList />
        </main>
      </div>
    </div>
  );
}
