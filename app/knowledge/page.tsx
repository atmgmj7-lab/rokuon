import { getAllKnowledge } from "@/src/actions/knowledge-actions";
import Link from "next/link";
import KnowledgeImporter from "@/src/components/knowledge/KnowledgeImporter";

export default async function KnowledgePage() {
  const knowledgeItems = await getAllKnowledge();

  const categoryCounts = {
    objection: knowledgeItems.filter((k) => k.category === "objection").length,
    question: knowledgeItems.filter((k) => k.category === "question").length,
    hearing: knowledgeItems.filter((k) => k.category === "hearing").length,
    key_talk: knowledgeItems.filter((k) => k.category === "key_talk").length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* ヘッダー */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-800">
                📚 ナレッジベース
              </h1>
              <p className="text-gray-600 mt-2">
                トップアポインターのトーク集・戦略メモ
              </p>
            </div>
            <Link
              href="/"
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors"
            >
              ← ホームへ
            </Link>
          </div>

          {/* 統計 */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="bg-red-50 rounded-lg p-4 text-center">
              <div className="text-3xl mb-2">🛡️</div>
              <div className="text-2xl font-bold text-red-600">{categoryCounts.objection}</div>
              <div className="text-sm text-gray-600">断り文句</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="text-3xl mb-2">❓</div>
              <div className="text-2xl font-bold text-blue-600">{categoryCounts.question}</div>
              <div className="text-sm text-gray-600">質問集</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-3xl mb-2">🎯</div>
              <div className="text-2xl font-bold text-green-600">{categoryCounts.hearing}</div>
              <div className="text-sm text-gray-600">ヒアリング項目</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <div className="text-3xl mb-2">💎</div>
              <div className="text-2xl font-bold text-purple-600">{categoryCounts.key_talk}</div>
              <div className="text-sm text-gray-600">さしどころトーク</div>
            </div>
          </div>
        </div>

        {/* インポーター */}
        <KnowledgeImporter />

        {/* ナレッジ一覧 */}
        {knowledgeItems.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <p className="text-gray-500 mb-4">まだナレッジがありません</p>
            <p className="text-sm text-gray-400">
              上記のインポート機能を使って、Figmaの文面データを取り込んでください
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {knowledgeItems.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {item.category === "objection" && <span className="text-2xl">🛡️</span>}
                    {item.category === "question" && <span className="text-2xl">❓</span>}
                    {item.category === "hearing" && <span className="text-2xl">🎯</span>}
                    {item.category === "key_talk" && <span className="text-2xl">💎</span>}
                    <h3 className="text-lg font-bold text-gray-800">
                      {item.title}
                    </h3>
                  </div>
                </div>

                <p className="text-gray-700 mb-4 whitespace-pre-wrap">
                  {item.content}
                </p>

                {item.logic_explanation && (
                  <div className="bg-purple-50 rounded-lg p-3 mb-3">
                    <p className="text-sm text-purple-700">
                      💡 <strong>ロジック:</strong> {item.logic_explanation}
                    </p>
                  </div>
                )}

                {item.next_move_hint && (
                  <div className="bg-green-50 rounded-lg p-3 mb-3">
                    <p className="text-sm text-green-700">
                      ➡️ <strong>次の一手:</strong> {item.next_move_hint}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>使用: {item.usage_count}回</span>
                  {item.usage_count > 0 && (
                    <span className="text-green-600 font-medium">
                      成功率: {Math.round((item.success_count / item.usage_count) * 100)}%
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
