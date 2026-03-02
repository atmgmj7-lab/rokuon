"use client";

import { useState, useEffect } from "react";
import {
  getAllHearingCategories,
  getAllHearingItems,
  createHearingCategory,
  deleteHearingCategory,
  createHearingItem,
  updateHearingItem,
  deleteHearingItem,
  type HearingCategory,
  type HearingItem,
} from "@/src/actions/hearing-actions";

interface HearingManagerProps {
  onUpdate?: () => void;
}

export default function HearingManager({ onUpdate }: HearingManagerProps) {
  const [categories, setCategories] = useState<HearingCategory[]>([]);
  const [items, setItems] = useState<HearingItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemContent, setNewItemContent] = useState("");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingContent, setEditingContent] = useState("");

  const loadData = async () => {
    const [cats, itemsList] = await Promise.all([
      getAllHearingCategories(),
      getAllHearingItems(),
    ]);
    setCategories(cats);
    setItems(itemsList);
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);
  const itemsInSelected = selectedCategoryId
    ? items.filter((i) => i.category_id === selectedCategoryId)
    : [];

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      alert("カテゴリ名を入力してください");
      return;
    }
    const result = await createHearingCategory(newCategoryName.trim());
    if (result.success) {
      setNewCategoryName("");
      await loadData();
      if (result.id) setSelectedCategoryId(result.id);
      onUpdate?.();
    } else {
      alert(result.error);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("このカテゴリと中に含まれるヒアリング項目をすべて削除してもよろしいですか？")) return;
    const result = await deleteHearingCategory(id);
    if (result.success) {
      if (selectedCategoryId === id) setSelectedCategoryId(null);
      await loadData();
      onUpdate?.();
    } else {
      alert(result.error);
    }
  };

  const handleCreateItem = async () => {
    if (!selectedCategoryId || !newItemTitle.trim()) {
      alert("タイトルを入力してください");
      return;
    }
    const result = await createHearingItem(
      selectedCategoryId,
      newItemTitle.trim(),
      newItemContent.trim()
    );
    if (result.success) {
      setNewItemTitle("");
      setNewItemContent("");
      await loadData();
      onUpdate?.();
    } else {
      alert(result.error);
    }
  };

  const handleUpdateItem = async () => {
    if (!editingItemId) return;
    const result = await updateHearingItem(
      editingItemId,
      editingTitle.trim(),
      editingContent.trim()
    );
    if (result.success) {
      setEditingItemId(null);
      setEditingTitle("");
      setEditingContent("");
      await loadData();
      onUpdate?.();
    } else {
      alert(result.error);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm("このヒアリング項目を削除しますか？")) return;
    const result = await deleteHearingItem(id);
    if (result.success) {
      await loadData();
      onUpdate?.();
    } else {
      alert(result.error);
    }
  };

  return (
    <div className="flex gap-6">
      {/* 左: カテゴリ一覧 */}
      <div className="w-96 bg-white rounded-2xl border border-stone-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[#2D2B2A]">カテゴリ</h2>
        </div>

        {/* カテゴリ追加フォーム */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="例: BANT 確認"
            className="flex-1 px-3 py-2 border border-stone-200 rounded-lg text-sm"
          />
          <button
            onClick={handleCreateCategory}
            className="px-4 py-2 bg-white border border-stone-200 text-stone-600 rounded-lg font-medium hover:bg-stone-50 hover:text-stone-900 transition-colors text-sm"
          >
            追加
          </button>
        </div>

        {categories.length === 0 && (
          <div className="text-center py-12 text-[#827F7B]">
            <p className="text-sm">まだカテゴリがありません</p>
            <p className="text-xs mt-1">上でカテゴリを追加してください</p>
          </div>
        )}

        <div className="space-y-2">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                selectedCategoryId === cat.id
                  ? "bg-stone-100 border-2 border-stone-400"
                  : "bg-white border border-stone-200/80 hover:border-stone-300"
              }`}
            >
              <div
                className="flex-1 min-w-0"
                onClick={() => setSelectedCategoryId(cat.id)}
              >
                <h4 className="font-bold text-[#2D2B2A] text-sm truncate">{cat.name}</h4>
                <p className="text-xs text-[#827F7B] mt-0.5">
                  {items.filter((i) => i.category_id === cat.id).length} 項目
                </p>
              </div>
              <button
                onClick={() => handleDeleteCategory(cat.id)}
                className="ml-2 px-2 py-1 bg-white border border-stone-200 text-stone-600 rounded text-xs hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                title="削除"
              >
                削除
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 右: ヒアリング項目（トーク内容） */}
      <div className="flex-1 bg-white rounded-2xl border border-stone-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] p-6">
        {!selectedCategory ? (
          <div className="h-full flex items-center justify-center text-[#827F7B]">
            <div className="text-center">
              <p className="text-lg">左からカテゴリを選択してください</p>
              <p className="text-sm mt-2 opacity-70">選択したカテゴリのヒアリング項目を管理できます</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-[#2D2B2A]">{selectedCategory.name}</h3>

            {/* ヒアリング項目追加フォーム */}
            <div className="bg-stone-50 rounded-lg p-4 border border-stone-200/80">
              <h4 className="text-sm font-bold text-[#2D2B2A] mb-3">ヒアリング項目を追加</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-[#827F7B] mb-1">タイトル（必須）</label>
                  <input
                    type="text"
                    value={newItemTitle}
                    onChange={(e) => setNewItemTitle(e.target.value)}
                    placeholder="例: 予算の確認"
                    className="w-full px-4 py-2 border border-stone-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#827F7B] mb-1">トーク内容</label>
                  <textarea
                    value={newItemContent}
                    onChange={(e) => setNewItemContent(e.target.value)}
                    placeholder="例: 予算はどのくらいお考えでしょうか？"
                    rows={3}
                    className="w-full px-4 py-2 border border-stone-200 rounded-lg text-sm resize-none"
                  />
                </div>
                <button
                  onClick={handleCreateItem}
                  className="px-6 py-2 bg-[#C87A55] hover:bg-[#B56A45] text-white rounded-lg font-medium text-sm transition-colors"
                >
                  追加する
                </button>
              </div>
            </div>

            {/* ヒアリング項目一覧 */}
            <div>
              <h4 className="text-sm font-bold text-[#2D2B2A] mb-3">登録済みのヒアリング項目</h4>
              {itemsInSelected.length === 0 ? (
                <p className="text-sm text-[#827F7B] py-4">ヒアリング項目がありません。上で追加してください。</p>
              ) : (
                <div className="space-y-3">
                  {itemsInSelected.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 bg-stone-50 rounded-lg border border-stone-200/80"
                    >
                      {editingItemId === item.id ? (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-[#827F7B] mb-1">タイトル</label>
                            <input
                              type="text"
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm"
                              autoFocus
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-[#827F7B] mb-1">トーク内容</label>
                            <textarea
                              value={editingContent}
                              onChange={(e) => setEditingContent(e.target.value)}
                              rows={3}
                              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm resize-none"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={handleUpdateItem}
                              className="px-4 py-2 bg-[#C87A55] text-white rounded-lg text-sm font-medium"
                            >
                              保存
                            </button>
                            <button
                              onClick={() => {
                                setEditingItemId(null);
                                setEditingTitle("");
                                setEditingContent("");
                              }}
                              className="px-4 py-2 bg-white border border-stone-200 rounded-lg text-sm"
                            >
                              キャンセル
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h5 className="font-bold text-[#2D2B2A] text-sm">{item.title || "（無題）"}</h5>
                            {item.content && (
                              <p className="text-sm text-[#36332E] mt-1 whitespace-pre-wrap">{item.content}</p>
                            )}
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <button
                              onClick={() => {
                                setEditingItemId(item.id);
                                setEditingTitle(item.title);
                                setEditingContent(item.content);
                              }}
                              className="p-2 text-stone-400 hover:text-[#C87A55] hover:bg-[#FCF7F4] rounded-lg transition-colors"
                              title="編集"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="削除"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
