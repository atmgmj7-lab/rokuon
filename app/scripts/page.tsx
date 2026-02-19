import { getAllScripts } from "@/src/actions/script-actions";
import Link from "next/link";

export default async function ScriptsPage() {
  const scripts = await getAllScripts();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-12">
      <div className="container mx-auto px-4">
        <header className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl font-bold text-gray-800">📝 トークスクリプト</h1>
            <Link
              href="/"
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors"
            >
              ← ホームへ
            </Link>
          </div>
          <p className="text-gray-600">
            テレアポで使用するトークスクリプトを管理します
          </p>
        </header>

        {/* スクリプト一覧 */}
        {scripts.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <p className="text-gray-500 mb-6">まだスクリプトがありません</p>
            <Link
              href="/scripts/new"
              className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-md"
            >
              ➕ 新規スクリプトを作成
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6 text-right">
              <Link
                href="/scripts/new"
                className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-md"
              >
                ➕ 新規スクリプトを作成
              </Link>
            </div>

            <div className="grid gap-6 grid-cols-3">
              {scripts.map((script) => (
                <div
                  key={script.id}
                  className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow"
                >
                  <h2 className="text-xl font-bold text-gray-800 mb-2">
                    {script.title}
                  </h2>
                  <p className="text-sm text-gray-500 mb-4">
                    作成日:{" "}
                    {new Date(script.created_at).toLocaleDateString("ja-JP")}
                  </p>
                  <div className="flex flex-col gap-2">
                    <Link
                      href={`/scripts/${script.id}/live`}
                      className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-medium text-center transition-all"
                    >
                      🎯 Live Assistant
                    </Link>
                    <div className="flex gap-2">
                      <Link
                        href={`/scripts/${script.id}/run`}
                        className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg font-medium text-center transition-all"
                      >
                        ▶️ 実行
                      </Link>
                      <Link
                        href={`/scripts/${script.id}/logs`}
                        className="px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg font-medium transition-colors"
                        title="実行ログ"
                      >
                        📊
                      </Link>
                      <Link
                        href={`/scripts/${script.id}/edit`}
                        className="px-4 py-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-700 rounded-lg font-medium transition-colors"
                        title="編集"
                      >
                        ✏️
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
