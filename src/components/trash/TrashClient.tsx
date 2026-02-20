"use client";

import { useState } from "react";
import Link from "next/link";
import {
  restoreRecording,
  deleteRecordingPermanently,
  emptyTrash,
  type TrashRecording,
} from "@/src/actions/trash-actions";

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString("ja-JP");
}

function getTypeLabel(type: string): string {
  switch (type) {
    case "case":
      return "課題音声";
    case "feedback":
      return "指導音声";
    case "model":
      return "お手本";
    default:
      return type;
  }
}

export default function TrashClient({ items: initialItems }: { items: TrashRecording[] }) {
  const [items, setItems] = useState(initialItems);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [emptying, setEmptying] = useState(false);

  const handleRestore = async (id: string) => {
    setRestoringId(id);
    try {
      const result = await restoreRecording(id);
      if (result.success) {
        setItems((prev) => prev.filter((i) => i.id !== id));
      } else {
        alert(`復元に失敗しました: ${result.error}`);
      }
    } finally {
      setRestoringId(null);
    }
  };

  const handleDeletePermanently = async (id: string) => {
    if (!window.confirm("完全に削除しますか？この操作は取り消せません。")) return;
    setDeletingId(id);
    try {
      const result = await deleteRecordingPermanently(id);
      if (result.success) {
        setItems((prev) => prev.filter((i) => i.id !== id));
      } else {
        alert(`削除に失敗しました: ${result.error}`);
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleEmptyTrash = async () => {
    if (!window.confirm("ゴミ箱を空にしますか？すべてのアイテムが完全に削除されます。この操作は取り消せません。")) return;
    setEmptying(true);
    try {
      const result = await emptyTrash();
      if (result.success) {
        setItems([]);
      } else {
        alert(`削除に失敗しました: ${result.error}`);
      }
    } finally {
      setEmptying(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] p-12 text-center">
        <p className="text-[#827F7B] mb-6">ゴミ箱は空です</p>
        <Link
          href="/recordings"
          className="inline-block px-6 py-3 bg-white border border-stone-200 text-stone-600 rounded-lg font-medium hover:bg-stone-50 hover:text-stone-900 transition-colors"
        >
          録音一覧へ戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleEmptyTrash}
          disabled={emptying}
          className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg font-medium hover:bg-red-100 disabled:opacity-50 transition-colors"
        >
          {emptying ? "削除中..." : "ゴミ箱を空にする"}
        </button>
      </div>

      <div className="space-y-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-xl border border-stone-200/80 shadow-sm p-6 flex flex-wrap items-center justify-between gap-4"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="px-2 py-0.5 bg-stone-100 text-stone-600 rounded text-xs font-medium">
                  {getTypeLabel(item.recording_type)}
                </span>
                {item.is_training_data && (
                  <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-xs font-medium">
                    学習データ
                  </span>
                )}
                <h3 className="text-lg font-bold text-[#36332E] truncate">{item.title}</h3>
              </div>
              <p className="text-sm text-[#9E9A95] font-mono">ID: {item.id}</p>
              <p className="text-sm text-[#9E9A95] mt-1">
                {Math.floor(item.duration / 60)}分{item.duration % 60}秒 · {formatDate(item.updated_at)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleRestore(item.id)}
                disabled={restoringId === item.id}
                className="px-4 py-2 bg-[#C87A55] hover:bg-[#B56A45] text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
              >
                {restoringId === item.id ? "復元中..." : "復元"}
              </button>
              <button
                type="button"
                onClick={() => handleDeletePermanently(item.id)}
                disabled={deletingId === item.id}
                className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg font-medium hover:bg-red-100 disabled:opacity-50 transition-colors"
              >
                {deletingId === item.id ? "削除中..." : "完全に削除"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
