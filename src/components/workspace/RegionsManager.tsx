"use client";

import { useState, useEffect, useRef } from "react";

type Region = {
  id: string;
  prefecture: string;
  city: string;
  yomigana: string;
  population: number | null;
  search_volume: number | null;
};

type UploadResult = {
  inserted: number;
  updated: number;
  errors: string[];
  total: number;
};

export default function RegionsManager({ isAdmin }: { isAdmin: boolean }) {
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [filterPrefecture, setFilterPrefecture] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const loadRegions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/regions");
      const json = await res.json();
      if (json.success) setRegions(json.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRegions();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setUploadStatus("uploading");
    setUploadResult(null);
    setUploadError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/regions/upload", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();

      if (json.success) {
        setUploadResult(json.data);
        setUploadStatus("done");
        await loadRegions();
        if (fileRef.current) fileRef.current.value = "";
      } else {
        setUploadError(json.error || "アップロードに失敗しました");
        setUploadStatus("error");
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "アップロードに失敗しました");
      setUploadStatus("error");
    }
  };

  const prefectures = Array.from(new Set(regions.map((r) => r.prefecture))).sort();
  const displayed = filterPrefecture
    ? regions.filter((r) => r.prefecture === filterPrefecture)
    : regions;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-[#2D2B2A] mb-1">地域データ管理</h2>
        <p className="text-sm text-[#827F7B]">
          地域ごとの人口・読み仮名・検索ボリュームを CSV でインポートして管理します。
        </p>
      </div>

      {/* CSV アップロード（admin のみ） */}
      {isAdmin && (
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] p-6">
          <h3 className="text-lg font-bold text-[#2D2B2A] mb-2">CSV アップロード</h3>
          <p className="text-sm text-[#827F7B] mb-4">
            以下のヘッダーを持つ CSV ファイルを選択してください。既存データは更新されます。
          </p>
          <div className="mb-4 px-4 py-3 bg-stone-50 rounded-lg border border-stone-200 text-xs font-mono text-stone-600">
            prefecture,city,yomigana,population,search_volume
          </div>

          <form onSubmit={handleUpload} className="flex flex-wrap items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              required
              className="block text-sm text-stone-600 file:mr-3 file:px-4 file:py-2 file:rounded-lg file:border file:border-stone-200 file:bg-white file:text-sm file:font-medium file:text-stone-700 hover:file:bg-stone-50 file:transition-colors"
            />
            <button
              type="submit"
              disabled={uploadStatus === "uploading"}
              className="px-4 py-2 bg-[#4A463F] text-white rounded-lg font-medium hover:bg-[#3E3A34] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {uploadStatus === "uploading" ? "アップロード中..." : "インポート"}
            </button>
          </form>

          {/* 結果表示 */}
          {uploadStatus === "done" && uploadResult && (
            <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-sm">
              <p className="font-bold text-emerald-800 mb-1">インポート完了</p>
              <p className="text-emerald-700">
                合計 {uploadResult.total} 行 / 新規追加: {uploadResult.inserted} 件 / 更新: {uploadResult.updated} 件
              </p>
              {uploadResult.errors.length > 0 && (
                <div className="mt-2">
                  <p className="font-medium text-amber-700">スキップされた行:</p>
                  <ul className="mt-1 space-y-0.5 text-amber-700">
                    {uploadResult.errors.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          {uploadStatus === "error" && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {uploadError}
            </div>
          )}
        </div>
      )}

      {/* データ一覧 */}
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h3 className="text-lg font-bold text-[#2D2B2A]">
            地域データ一覧{" "}
            <span className="text-sm font-normal text-[#827F7B]">（{regions.length} 件）</span>
          </h3>
          {prefectures.length > 0 && (
            <select
              value={filterPrefecture}
              onChange={(e) => setFilterPrefecture(e.target.value)}
              className="px-3 py-2 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-stone-300 focus:border-stone-300 transition-all"
            >
              <option value="">すべての都道府県</option>
              {prefectures.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          )}
        </div>

        {loading ? (
          <p className="text-sm text-[#827F7B]">読み込み中...</p>
        ) : displayed.length === 0 ? (
          <p className="text-sm text-[#827F7B]">
            {regions.length === 0
              ? "まだデータがありません。CSV をインポートしてください。"
              : "該当データがありません。"}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200">
                  <th className="text-left py-3 px-4 font-bold text-[#2D2B2A]">都道府県</th>
                  <th className="text-left py-3 px-4 font-bold text-[#2D2B2A]">市区町村</th>
                  <th className="text-left py-3 px-4 font-bold text-[#2D2B2A]">読み仮名</th>
                  <th className="text-right py-3 px-4 font-bold text-[#2D2B2A]">人口</th>
                  <th className="text-right py-3 px-4 font-bold text-[#2D2B2A]">検索ボリューム</th>
                </tr>
              </thead>
              <tbody>
                {displayed.map((region) => (
                  <tr key={region.id} className="border-b border-stone-100 hover:bg-stone-50/50">
                    <td className="py-3 px-4 text-[#2D2B2A]">{region.prefecture}</td>
                    <td className="py-3 px-4 text-[#2D2B2A]">{region.city}</td>
                    <td className="py-3 px-4 text-[#827F7B]">{region.yomigana || "—"}</td>
                    <td className="py-3 px-4 text-right text-[#2D2B2A]">
                      {region.population !== null ? region.population.toLocaleString() : "—"}
                    </td>
                    <td className="py-3 px-4 text-right text-[#2D2B2A]">
                      {region.search_volume !== null ? region.search_volume.toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
