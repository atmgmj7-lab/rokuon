"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface MindMap {
  id: string;
  title: string;
  description: string | null;
  updated_at: number;
}

export default function MindMapListPage() {
  const router = useRouter();
  const [maps, setMaps]     = useState<MindMap[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetch("/api/mind-maps")
      .then((r) => r.json())
      .then((j: { success: boolean; data: MindMap[] }) => {
        if (j.success) setMaps(j.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const createMap = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const res  = await fetch("/api/mind-maps", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ title: newTitle.trim() }),
      });
      const json = await res.json() as { success: boolean; data: { id: string } };
      if (json.success) router.push(`/mindmap/${json.data.id}`);
    } finally {
      setCreating(false);
    }
  };

  const deleteMap = async (id: string) => {
    if (!confirm("このマインドマップを削除しますか？")) return;
    await fetch(`/api/mind-maps/${id}`, { method: "DELETE" });
    setMaps((ms) => ms.filter((m) => m.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] py-10">
      <div className="max-w-3xl mx-auto px-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#2D2B2A]">マインドマップ</h1>
            <p className="text-sm text-stone-400 mt-1">トーク構成を視覚化・構造化</p>
          </div>
          <div className="flex gap-3">
            <Link href="/" className="px-4 py-2 text-sm border border-stone-200 rounded-xl text-stone-600 hover:bg-stone-50">
              ← ホーム
            </Link>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 text-sm bg-[#5B6AD0] text-white rounded-xl font-bold hover:bg-[#4B5AC0]"
            >
              ＋ 新規作成
            </button>
          </div>
        </div>

        {/* 新規作成フォーム */}
        {showForm && (
          <div className="mb-6 p-4 bg-white border border-stone-200 rounded-2xl shadow-sm">
            <p className="text-sm font-bold text-stone-700 mb-2">新しいマインドマップ</p>
            <div className="flex gap-2">
              <input
                autoFocus
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") createMap(); if (e.key === "Escape") setShowForm(false); }}
                placeholder="タイトルを入力..."
                className="flex-1 px-3 py-2 border border-stone-200 rounded-lg text-sm outline-none focus:border-blue-400"
              />
              <button
                onClick={createMap}
                disabled={creating || !newTitle.trim()}
                className="px-4 py-2 bg-[#5B6AD0] text-white text-sm rounded-lg font-bold disabled:opacity-50"
              >
                {creating ? "作成中..." : "作成"}
              </button>
              <button
                onClick={() => { setShowForm(false); setNewTitle(""); }}
                className="px-3 py-2 text-sm border border-stone-200 rounded-lg text-stone-500 hover:bg-stone-50"
              >
                キャンセル
              </button>
            </div>
          </div>
        )}

        {/* 一覧 */}
        {loading ? (
          <p className="text-center text-stone-400 mt-12">読み込み中...</p>
        ) : maps.length === 0 ? (
          <div className="text-center py-16 text-stone-400">
            <p className="text-4xl mb-4">🗺️</p>
            <p className="text-sm">まだマインドマップがありません</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 px-6 py-3 bg-[#5B6AD0] text-white rounded-xl font-bold text-sm hover:bg-[#4B5AC0]"
            >
              最初のマインドマップを作成
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {maps.map((m) => (
              <div
                key={m.id}
                className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <Link href={`/mindmap/${m.id}`} className="flex-1 group">
                    <h2 className="text-base font-bold text-[#2D2B2A] group-hover:text-[#5B6AD0] transition-colors">
                      {m.title}
                    </h2>
                    {m.description && (
                      <p className="text-xs text-stone-400 mt-1">{m.description}</p>
                    )}
                    <p className="text-[11px] text-stone-300 mt-2">
                      更新: {new Date(m.updated_at).toLocaleString("ja-JP")}
                    </p>
                  </Link>
                  <button
                    onClick={() => deleteMap(m.id)}
                    className="ml-4 text-stone-300 hover:text-red-400 transition-colors text-sm"
                    title="削除"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
