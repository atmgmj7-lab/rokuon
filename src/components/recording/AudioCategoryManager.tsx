"use client";

import { useState } from "react";
import {
  getAllAudioCategories,
  createAudioCategory,
  updateAudioCategory,
  deleteAudioCategory,
  type AudioCategory,
} from "@/src/actions/audio-category-actions";

interface AudioCategoryManagerProps {
  categories: AudioCategory[];
}

export default function AudioCategoryManager({ categories: initialCategories }: AudioCategoryManagerProps) {
  const [showModal, setShowModal] = useState(false);
  const [categories, setCategories] = useState(initialCategories);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#6B7280");

  const refresh = async () => {
    const list = await getAllAudioCategories();
    setCategories(list);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const result = await createAudioCategory(newName.trim(), newColor);
    if (result.success) {
      setNewName("");
      setNewColor("#6B7280");
      await refresh();
    } else {
      alert(result.error);
    }
  };

  const handleUpdate = async (id: string, name: string, color: string) => {
    const result = await updateAudioCategory(id, name, color);
    if (result.success) {
      setEditingId(null);
      await refresh();
    } else {
      alert(result.error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("この音声カテゴリを削除しますか？紐づく録音のカテゴリは未設定になります。")) return;
    const result = await deleteAudioCategory(id);
    if (result.success) {
      await refresh();
    } else {
      alert(result.error);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => setShowModal(!showModal)}
        className="text-sm text-[#827F7B] hover:text-[#36332E] underline"
      >
        音声カテゴリ管理
      </button>
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-[#2D2B2A] mb-4">音声カテゴリ管理</h3>
            <p className="text-xs text-[#9E9A95] mb-4">
              録音の種類（商談、会議、指導など）を管理します。ワークスペースカテゴリとは別です。
            </p>
            <div className="space-y-3 mb-4">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center gap-2 p-2 rounded-lg border border-stone-200"
                >
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: cat.color }}
                  />
                  {editingId === cat.id ? (
                    <>
                      <input
                        type="text"
                        defaultValue={cat.name}
                        id={`edit-${cat.id}`}
                        className="flex-1 px-2 py-1 border rounded text-sm"
                      />
                      <input
                        type="color"
                        defaultValue={cat.color}
                        id={`color-${cat.id}`}
                        className="w-8 h-8 cursor-pointer"
                      />
                      <button
                        onClick={() => {
                          const input = document.getElementById(`edit-${cat.id}`) as HTMLInputElement;
                          const colorInput = document.getElementById(`color-${cat.id}`) as HTMLInputElement;
                          handleUpdate(cat.id, input?.value ?? cat.name, colorInput?.value ?? cat.color);
                        }}
                        className="px-2 py-1 bg-[#C87A55] text-white rounded text-sm"
                      >
                        保存
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-2 py-1 border rounded text-sm"
                      >
                        キャンセル
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm">{cat.name}</span>
                      <button
                        onClick={() => setEditingId(cat.id)}
                        className="px-2 py-1 border rounded text-xs"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => handleDelete(cat.id)}
                        className="px-2 py-1 text-red-600 border border-red-200 rounded text-xs hover:bg-red-50"
                      >
                        削除
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="新規カテゴリ名（例: 商談）"
                className="flex-1 px-3 py-2 border border-stone-200 rounded-lg text-sm"
              />
              <input
                type="color"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                className="w-10 h-10 cursor-pointer rounded"
              />
              <button
                onClick={handleCreate}
                className="px-4 py-2 bg-[#C87A55] text-white rounded-lg text-sm font-medium"
              >
                追加
              </button>
            </div>
            <button
              onClick={() => setShowModal(false)}
              className="w-full py-2 border border-stone-200 rounded-lg text-sm"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
