import {
  getDictionaries,
  addDictionary,
  deleteDictionary,
} from "@/src/actions/dictionary-actions";
import Link from "next/link";

const CATEGORY_OPTIONS = [
  { value: "", label: "未選択" },
  { value: "product", label: "自社製品" },
  { value: "competitor", label: "競合" },
  { value: "jargon", label: "業界用語" },
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  product: "自社製品",
  competitor: "競合",
  jargon: "業界用語",
};

export default async function DictionaryPage() {
  const dictionaries = await getDictionaries();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* ページヘッダー */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl font-bold text-gray-800">
              📖 ユーザー辞書管理
            </h1>
            <Link
              href="/recordings"
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors"
            >
              ← 録音一覧へ
            </Link>
          </div>
          <p className="text-gray-600">
            企業固有の専門用語を登録し、文字起こしの精度を高めます。Salesforce、BANT などの用語を登録しておくと、Whisper API がより正確に認識します。
          </p>
        </div>

        {/* 追加フォーム */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-6">
            用語を追加
          </h2>
          <form action={addDictionary} className="space-y-5">
            <div>
              <label
                htmlFor="term"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                専門用語 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="term"
                name="term"
                required
                placeholder="例: Salesforce, BANT"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              />
            </div>
            <div>
              <label
                htmlFor="reading"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                読み方・補足（任意）
              </label>
              <input
                type="text"
                id="reading"
                name="reading"
                placeholder="例: セールスフォース"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              />
            </div>
            <div>
              <label
                htmlFor="category"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                カテゴリ（任意）
              </label>
              <select
                id="category"
                name="category"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white"
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-lg shadow-md transition-all"
            >
              ➕ 追加する
            </button>
          </form>
        </div>

        {/* 登録済み用語一覧 */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-800">
              登録済み用語（{dictionaries.length}件）
            </h2>
          </div>

          {dictionaries.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              まだ用語が登録されていません。上記フォームから追加してください。
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      専門用語
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      読み方・補足
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      カテゴリ
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700 w-24">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {dictionaries.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-6 py-4 font-medium text-gray-800">
                        {item.term}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {item.reading || "—"}
                      </td>
                      <td className="px-6 py-4">
                        {item.category ? (
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-700">
                            {CATEGORY_LABELS[item.category] || item.category}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <form
                          action={deleteDictionary.bind(null, item.id)}
                          className="inline"
                        >
                          <button
                            type="submit"
                            className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                          >
                            削除
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
