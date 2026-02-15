"use client";

import { useState, useEffect } from "react";
import {
  getWorkspaceHierarchy,
  createCategory,
  createFolder,
  createItem,
  updateItem,
  deleteItem,
  getAllFolders,
  toggleSidebarVisibility,
} from "@/src/actions/workspace-actions";
import { seedWorkspace } from "@/src/actions/seed-workspace";
import type { ScriptFolder, ScriptItem } from "@/src/types/workspace";
import Link from "next/link";

export default function WorkspacePage() {
  const [hierarchy, setHierarchy] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeBaseTalkTab, setActiveBaseTalkTab] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<ScriptItem | null>(null);
  const [editingItem, setEditingItem] = useState<ScriptItem | null>(null);
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [allFolders, setAllFolders] = useState<ScriptFolder[]>([]);
  const [expandedSituationalFolders, setExpandedSituationalFolders] = useState<Set<string>>(new Set());
  const [overlayItem, setOverlayItem] = useState<ScriptItem | null>(null);

  // データを読み込む
  const loadData = async () => {
    setLoading(true);
    const result = await getWorkspaceHierarchy();
    if (result.success) {
      setHierarchy(result.hierarchy);
      
      // 最初のカテゴリを自動選択
      if (result.hierarchy.length > 0 && !selectedCategory) {
        const firstCategory = result.hierarchy[0];
        setSelectedCategory(firstCategory.category.id);
        
        // 最初のbase_talkフォルダを自動選択
        const baseTalkFolder = firstCategory.folders.find(
          (f: any) => f.folder.folder_type === "base_talk"
        );
        if (baseTalkFolder) {
          setActiveBaseTalkTab(baseTalkFolder.folder.id);
        }
      }
    }
    
    // すべてのフォルダを取得（カスタマイズ用）
    const folders = await getAllFolders();
    setAllFolders(folders);
    
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // カテゴリを切り替え
  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    const category = hierarchy?.find((c: any) => c.category.id === categoryId);
    if (category) {
      const baseTalkFolder = category.folders.find(
        (f: any) => f.folder.folder_type === "base_talk"
      );
      if (baseTalkFolder) {
        setActiveBaseTalkTab(baseTalkFolder.folder.id);
      }
    }
    setSelectedItem(null);
    setEditingItem(null);
  };

  // 状況別フォルダの展開/折りたたみ
  const toggleSituationalFolder = (folderId: string) => {
    const newExpanded = new Set(expandedSituationalFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedSituationalFolders(newExpanded);
  };

  // アイテムをクリック（右ペインから）
  const handleSituationalItemClick = (item: ScriptItem) => {
    setOverlayItem(item);
  };

  // アイテムをクリック（中央ペインから）
  const handleBaseTalkItemClick = (item: ScriptItem) => {
    setSelectedItem(item);
    setEditingItem(null);
  };

  // 編集モードに切り替え
  const handleEditClick = (item: ScriptItem) => {
    setEditingItem({ ...item });
  };

  // 編集を保存
  const handleSaveEdit = async () => {
    if (!editingItem) return;

    const result = await updateItem(
      editingItem.id,
      editingItem.title,
      editingItem.content,
      editingItem.strategy_note,
      editingItem.next_move_hint
    );

    if (result.success) {
      await loadData();
      setEditingItem(null);
      setOverlayItem(null);
      setSelectedItem(editingItem);
    } else {
      alert(`エラー: ${result.error}`);
    }
  };

  // サイドバー表示を切り替え
  const handleToggleVisibility = async (folderId: string, isVisible: boolean) => {
    const result = await toggleSidebarVisibility(folderId, isVisible);
    if (result.success) {
      await loadData();
    }
  };

  // 新規フォルダ作成
  const handleCreateFolder = async (folderType: "base_talk" | "situational") => {
    if (!selectedCategory) {
      alert("カテゴリを選択してください");
      return;
    }

    const name = prompt(
      folderType === "base_talk"
        ? "基本トーク名を入力（例: ネット充実企業用）"
        : "ジャンル名を入力（例: クロージング）"
    );
    if (!name) return;

    const result = await createFolder(selectedCategory, name, folderType);
    if (result.success) {
      await loadData();
      if (folderType === "base_talk" && result.folderId) {
        setActiveBaseTalkTab(result.folderId);
      }
    }
  };

  // 新規アイテム作成
  const handleCreateItem = async (folderId: string) => {
    const title = prompt("トークタイトルを入力してください");
    if (!title) return;

    const content = prompt("トーク内容を入力してください");
    if (!content) return;

    const result = await createItem(folderId, title, content);
    if (result.success) {
      await loadData();
    }
  };

  // サンプルデータをシード
  const handleSeedWorkspace = async () => {
    if (!confirm("サンプルデータを作成しますか？（IT企業・建設業のトーク集）")) return;

    const result = await seedWorkspace();
    if (result.success) {
      alert(`✅ ${result.message}`);
      await loadData();
    } else {
      alert(`❌ エラー: ${result.error}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  const currentCategory = hierarchy?.find((c: any) => c.category.id === selectedCategory);
  const baseTalkFolders = currentCategory?.folders.filter((f: any) => f.folder.folder_type === "base_talk") || [];
  const situationalFolders = currentCategory?.folders.filter(
    (f: any) => f.folder.folder_type === "situational" && f.folder.is_visible_in_sidebar === 1
  ) || [];
  const activeFolder = baseTalkFolders.find((f: any) => f.folder.id === activeBaseTalkTab);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-gray-800">📁 トークワークスペース</h1>
          
          {/* カテゴリ選択 */}
          {hierarchy && hierarchy.length > 0 && (
            <select
              value={selectedCategory || ""}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              {hierarchy.map((catData: any) => (
                <option key={catData.category.id} value={catData.category.id}>
                  {catData.category.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex gap-2">
          {(!hierarchy || hierarchy.length === 0) && (
            <button
              onClick={handleSeedWorkspace}
              className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              🌱 サンプルデータ作成
            </button>
          )}
          <Link
            href="/"
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium transition-colors"
          >
            ← ホーム
          </Link>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* 中央ペイン */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 基本トークタブ */}
          {baseTalkFolders.length > 0 && (
            <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-2 overflow-x-auto">
              {baseTalkFolders.map((folderData: any) => (
                <button
                  key={folderData.folder.id}
                  onClick={() => setActiveBaseTalkTab(folderData.folder.id)}
                  className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                    activeBaseTalkTab === folderData.folder.id
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  }`}
                >
                  📄 {folderData.folder.name}
                </button>
              ))}
              <button
                onClick={() => handleCreateFolder("base_talk")}
                className="px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg font-medium whitespace-nowrap transition-colors"
              >
                ＋ 基本トークを追加
              </button>
            </div>
          )}

          {/* 基本トークアイテム表示 */}
          <div className="flex-1 overflow-y-auto p-6">
            {!activeFolder && (
              <div className="text-center py-20 text-gray-500">
                <p>カテゴリを選択してください</p>
              </div>
            )}

            {activeFolder && (
              <div className="max-w-4xl mx-auto space-y-4">
                {activeFolder.items.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <p className="mb-4">トークアイテムがありません</p>
                    <button
                      onClick={() => handleCreateItem(activeFolder.folder.id)}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                    >
                      ➕ トークを追加
                    </button>
                  </div>
                )}

                {activeFolder.items.map((item: ScriptItem, index: number) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer"
                    onClick={() => handleBaseTalkItemClick(item)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold text-gray-400">
                          {index + 1}
                        </span>
                        <h3 className="text-xl font-bold text-gray-800">{item.title}</h3>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditClick(item);
                        }}
                        className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-sm font-medium transition-colors"
                      >
                        ✏️ 編集
                      </button>
                    </div>

                    <p className="text-gray-700 whitespace-pre-wrap leading-relaxed mb-4">
                      {item.content}
                    </p>

                    {item.strategy_note && (
                      <div className="p-3 bg-purple-50 rounded-lg border border-purple-200 mb-2">
                        <p className="text-sm text-purple-700">
                          💡 <strong>戦略:</strong> {item.strategy_note}
                        </p>
                      </div>
                    )}

                    {item.next_move_hint && (
                      <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                        <p className="text-sm text-green-700">
                          ➡️ <strong>次の一手:</strong> {item.next_move_hint}
                        </p>
                      </div>
                    )}
                  </div>
                ))}

                {activeFolder.items.length > 0 && (
                  <div className="text-center pt-6">
                    <button
                      onClick={() => handleCreateItem(activeFolder.folder.id)}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                    >
                      ➕ トークを追加
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 右ペイン: 武器庫 */}
        <div className="w-96 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
          {/* 武器庫ヘッダー */}
          <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-4 flex items-center justify-between">
            <h2 className="text-lg font-bold">🛡️ 武器庫</h2>
            <button
              onClick={() => setShowCustomizeModal(true)}
              className="px-3 py-1 bg-white bg-opacity-20 hover:bg-opacity-30 rounded text-sm font-medium transition-colors"
            >
              ⚙️ カスタマイズ
            </button>
          </div>

          {/* 状況別フォルダ一覧 */}
          <div className="flex-1 overflow-y-auto p-4">
            {situationalFolders.length === 0 && (
              <div className="text-center py-12 text-gray-500 text-sm">
                <p className="mb-4">表示する武器庫がありません</p>
                <button
                  onClick={() => handleCreateFolder("situational")}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  ➕ ジャンルを追加
                </button>
              </div>
            )}

            {situationalFolders.map((folderData: any) => (
              <div key={folderData.folder.id} className="mb-3">
                <button
                  onClick={() => toggleSituationalFolder(folderData.folder.id)}
                  className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium text-left flex items-center justify-between transition-colors"
                >
                  <span>{folderData.folder.name}</span>
                  <span className="text-sm">
                    {expandedSituationalFolders.has(folderData.folder.id) ? "▼" : "▶"}
                  </span>
                </button>

                {expandedSituationalFolders.has(folderData.folder.id) && (
                  <div className="mt-2 space-y-2 ml-2">
                    {folderData.items.map((item: ScriptItem) => (
                      <button
                        key={item.id}
                        onClick={() => handleSituationalItemClick(item)}
                        className="w-full px-3 py-2 bg-white hover:bg-orange-50 border border-gray-200 hover:border-orange-300 rounded-lg text-left text-sm transition-all"
                      >
                        <div className="font-medium text-gray-800">{item.title}</div>
                        <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {item.content.substring(0, 60)}...
                        </div>
                      </button>
                    ))}
                    <button
                      onClick={() => handleCreateItem(folderData.folder.id)}
                      className="w-full px-3 py-2 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg text-sm font-medium text-orange-700 transition-colors"
                    >
                      ＋ トークを追加
                    </button>
                  </div>
                )}
              </div>
            ))}

            {situationalFolders.length > 0 && (
              <button
                onClick={() => handleCreateFolder("situational")}
                className="w-full mt-4 px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors"
              >
                ➕ ジャンルを追加
              </button>
            )}
          </div>
        </div>
      </div>

      {/* カスタマイズモーダル */}
      {showCustomizeModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowCustomizeModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              ⚙️ 武器庫の表示設定
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              右ペインに表示するジャンルを選択してください
            </p>

            <div className="space-y-3">
              {allFolders
                .filter((f) => f.folder_type === "situational")
                .map((folder) => (
                  <label
                    key={folder.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={folder.is_visible_in_sidebar === 1}
                      onChange={(e) => handleToggleVisibility(folder.id, e.target.checked)}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="font-medium text-gray-800">{folder.name}</span>
                  </label>
                ))}
            </div>

            <button
              onClick={() => setShowCustomizeModal(false)}
              className="w-full mt-6 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              完了
            </button>
          </div>
        </div>
      )}

      {/* オーバーレイ（右ペインのアイテム表示） */}
      {overlayItem && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setOverlayItem(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {!editingItem ? (
              <>
                <div className="flex items-start justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">{overlayItem.title}</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditClick(overlayItem)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      ✏️ 編集
                    </button>
                    <button
                      onClick={() => setOverlayItem(null)}
                      className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium transition-colors"
                    >
                      ✖️
                    </button>
                  </div>
                </div>

                <div className="prose max-w-none">
                  <p className="text-gray-700 whitespace-pre-wrap text-lg leading-relaxed">
                    {overlayItem.content}
                  </p>
                </div>

                {overlayItem.strategy_note && (
                  <div className="mt-6 p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
                    <h3 className="font-bold text-purple-800 mb-2">💡 戦略メモ</h3>
                    <p className="text-purple-700 whitespace-pre-wrap">
                      {overlayItem.strategy_note}
                    </p>
                  </div>
                )}

                {overlayItem.next_move_hint && (
                  <div className="mt-4 p-4 bg-green-50 rounded-lg border-2 border-green-200">
                    <h3 className="font-bold text-green-800 mb-2">➡️ 次の一手</h3>
                    <p className="text-green-700 whitespace-pre-wrap">
                      {overlayItem.next_move_hint}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-gray-800 mb-6">編集モード</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      タイトル
                    </label>
                    <input
                      type="text"
                      value={editingItem.title}
                      onChange={(e) =>
                        setEditingItem({ ...editingItem, title: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      トーク内容
                    </label>
                    <textarea
                      value={editingItem.content}
                      onChange={(e) =>
                        setEditingItem({ ...editingItem, content: e.target.value })
                      }
                      rows={10}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      💡 戦略メモ（任意）
                    </label>
                    <textarea
                      value={editingItem.strategy_note || ""}
                      onChange={(e) =>
                        setEditingItem({ ...editingItem, strategy_note: e.target.value })
                      }
                      rows={3}
                      placeholder="なぜこのトークが効くのか..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ➡️ 次の一手（任意）
                    </label>
                    <textarea
                      value={editingItem.next_move_hint || ""}
                      onChange={(e) =>
                        setEditingItem({ ...editingItem, next_move_hint: e.target.value })
                      }
                      rows={2}
                      placeholder="次に何を聞くべきか..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleSaveEdit}
                      className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                    >
                      💾 保存
                    </button>
                    <button
                      onClick={() => setEditingItem(null)}
                      className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
                    >
                      ✖️ キャンセル
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 編集モーダル（中央ペインのアイテム用） */}
      {editingItem && !overlayItem && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setEditingItem(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-gray-800 mb-6">編集モード</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  タイトル
                </label>
                <input
                  type="text"
                  value={editingItem.title}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, title: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  トーク内容
                </label>
                <textarea
                  value={editingItem.content}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, content: e.target.value })
                  }
                  rows={10}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  💡 戦略メモ（任意）
                </label>
                <textarea
                  value={editingItem.strategy_note || ""}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, strategy_note: e.target.value })
                  }
                  rows={3}
                  placeholder="なぜこのトークが効くのか..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ➡️ 次の一手（任意）
                </label>
                <textarea
                  value={editingItem.next_move_hint || ""}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, next_move_hint: e.target.value })
                  }
                  rows={2}
                  placeholder="次に何を聞くべきか..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  💾 保存
                </button>
                <button
                  onClick={() => setEditingItem(null)}
                  className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
                >
                  ✖️ キャンセル
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
