import { getScriptById, getScriptLogs } from "@/src/actions/script-actions";
import Link from "next/link";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ScriptLogsPage({ params }: PageProps) {
  const { id } = await params;
  const script = await getScriptById(id);
  const logs = await getScriptLogs(id);

  if (!script) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-12">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* ヘッダー */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                📊 実行ログ
              </h1>
              <p className="text-gray-600 mt-2">{script.title}</p>
            </div>
            <div className="flex gap-2">
              <Link
                href={`/scripts/${id}/run`}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                ▶️ 実行
              </Link>
              <Link
                href="/scripts"
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors"
              >
                ← 一覧
              </Link>
            </div>
          </div>

          {/* 統計情報 */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">総実行回数</p>
              <p className="text-3xl font-bold text-blue-600">{logs.length}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">アポ獲得</p>
              <p className="text-3xl font-bold text-green-600">
                {logs.filter((log) => log.result_status === "appointment").length}
              </p>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">断られた</p>
              <p className="text-3xl font-bold text-red-600">
                {logs.filter((log) => log.result_status === "rejected").length}
              </p>
            </div>
          </div>
        </div>

        {/* ログ一覧 */}
        {logs.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <p className="text-gray-500 mb-4">まだ実行ログがありません</p>
            <Link
              href={`/scripts/${id}/run`}
              className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              ▶️ スクリプトを実行
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {logs.map((log, index) => {
              // ノード名を取得
              const getNodeLabel = (nodeId: string) => {
                const node = script.flowData.nodes.find((n) => n.id === nodeId);
                return node ? node.content.substring(0, 40) + "..." : nodeId;
              };

              // 結果ステータスの表示
              const getStatusBadge = (status: string) => {
                switch (status) {
                  case "appointment":
                    return (
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                        ✅ アポ獲得
                      </span>
                    );
                  case "rejected":
                    return (
                      <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                        ❌ 断られた
                      </span>
                    );
                  case "material_sent":
                    return (
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                        📧 資料送付
                      </span>
                    );
                  default:
                    return (
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                        ✓ 完了
                      </span>
                    );
                }
              };

              return (
                <div
                  key={log.id}
                  className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <span className="text-2xl font-bold text-gray-400">
                        #{logs.length - index}
                      </span>
                      {getStatusBadge(log.result_status)}
                    </div>
                    <p className="text-sm text-gray-500">
                      {new Date(log.created_at).toLocaleString("ja-JP")}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-gray-600">
                      🗺️ 通過した分岐:
                    </p>
                    <div className="flex flex-col gap-2">
                      {log.pathHistory.map((nodeId, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-blue-500 font-bold">
                            {idx + 1}.
                          </span>
                          <span className="text-sm text-gray-700 bg-gray-50 px-3 py-1 rounded">
                            {getNodeLabel(nodeId)}
                          </span>
                          {idx < log.pathHistory.length - 1 && (
                            <span className="text-gray-400">→</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
