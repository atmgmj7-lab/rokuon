"use client";

import { useState, useEffect } from "react";
import {
  getWorkspaceHierarchy,
  getAllItems,
  getItemById,
  updateItem,
  createItem,
  getResponsesByItem,
  createItemResponse,
  updateItemResponse,
  deleteItemResponse,
  getAllFolders,
  getAllDynamicCategories,
  createDynamicCategory,
} from "@/src/actions/workspace-actions";
import { seedWorkspace } from "@/src/actions/seed-workspace";
import type { ScriptItem, ItemResponse, ScriptFolder, Category } from "@/src/types/workspace";
import { useDebounce } from "@/src/hooks/useDebounce";
import Link from "next/link";

type SaveStatus = "idle" | "saving" | "saved" | "error";

export default function WorkspacePage() {
  const [hierarchy, setHierarchy] = useState<any>(null);
  const [allItems, setAllItems] = useState<ScriptItem[]>([]);
  const [allFolders, setAllFolders] = useState<ScriptFolder[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<ScriptItem | null>(null);
  const [responses, setResponses] = useState<ItemResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [activeTab, setActiveTab] = useState<"base" | "situational">("base");

  // 分岐数をカウント
  const [branchCounts, setBranchCounts] = useState<Map<string, number>>(new Map());

  // 編集中の値（デバウンス用）
  const [editingTitle, setEditingTitle] = useState("");
  const [editingHearingPurpose, setEditingHearingPurpose] = useState("");
  const [editingContent, setEditingContent] = useState("");
  const [editingStrategyNote, setEditingStrategyNote] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string>("");
  const [editingIsQuickResponse, setEditingIsQuickResponse] = useState<number>(0);

  // デバウンス処理
  const debouncedTitle = useDebounce(editingTitle, 1000);
  const debouncedHearingPurpose = useDebounce(editingHearingPurpose, 1000);
  const debouncedContent = useDebounce(editingContent, 1000);
  const debouncedStrategyNote = useDebounce(editingStrategyNote, 1000);

  // データを読み込む
  const loadData = async () => {
    setLoading(true);
    const hierarchyResult = await getWorkspaceHierarchy();
    if (hierarchyResult.success) {
      setHierarchy(hierarchyResult.hierarchy);
    }

    const items = await getAllItems();
    setAllItems(items);

    const folders = await getAllFolders();
    setAllFolders(folders);

    const cats = await getAllDynamicCategories();
    setCategories(cats);

    // 各アイテムの分岐数をカウント
    const counts = new Map<string, number>();
    for (const item of items) {
      const itemResponses = await getResponsesByItem(item.id);
      counts.set(item.id, itemResponses.length);
    }
    setBranchCounts(counts);

    // 選択中のアイテムをリロード
    if (selectedItemId) {
      await loadItem(selectedItemId);
    }

    setLoading(false);
  };

  // 特定のアイテムを読み込む
  const loadItem = async (itemId: string) => {
    const item = await getItemById(itemId);
    if (item) {
      setSelectedItem(item);
      setSelectedItemId(itemId);
      setEditingTitle(item.title);
      setEditingHearingPurpose(item.hearing_purpose || "");
      setEditingContent(item.content);
      setEditingStrategyNote(item.strategy_note || "");
      setEditingCategoryId(item.category_id || "");
      setEditingIsQuickResponse(item.is_quick_response || 0);

      // 返答パターンを取得
      const itemResponses = await getResponsesByItem(itemId);
      setResponses(itemResponses);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // デバウンス後に自動保存
  useEffect(() => {
    if (selectedItem && saveStatus !== "saving") {
      const hasChanges =
        debouncedTitle !== selectedItem.title ||
        debouncedHearingPurpose !== (selectedItem.hearing_purpose || "") ||
        debouncedContent !== selectedItem.content ||
        debouncedStrategyNote !== (selectedItem.strategy_note || "");

      if (hasChanges && debouncedTitle) {
        handleAutoSave();
      }
    }
  }, [debouncedTitle, debouncedHearingPurpose, debouncedContent, debouncedStrategyNote]);

  // 自動保存
  const handleAutoSave = async () => {
    if (!selectedItem) return;

    setSaveStatus("saving");
    const result = await updateItem(
      selectedItem.id,
      debouncedTitle,
      debouncedContent,
      debouncedHearingPurpose,
      debouncedStrategyNote,
      selectedItem.next_move_hint,
      editingCategoryId || undefined,
      editingIsQuickResponse
    );

    if (result.success) {
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
      // データを再読み込み（分岐数更新のため）
      const items = await getAllItems();
      setAllItems(items);
    } else {
      setSaveStatus("error");
    }
  };

  // カテゴリやQuick Response設定が変更されたら即座に保存
  const handleQuickSave = async (updates: Partial<ScriptItem>) => {
    if (!selectedItem) return;

    setSaveStatus("saving");
    const result = await updateItem(
      selectedItem.id,
      updates.title ?? selectedItem.title,
      updates.content ?? selectedItem.content,
      updates.hearing_purpose ?? selectedItem.hearing_purpose,
      updates.strategy_note ?? selectedItem.strategy_note,
      updates.next_move_hint ?? selectedItem.next_move_hint,
      updates.category_id ?? selectedItem.category_id,
      updates.is_quick_response ?? selectedItem.is_quick_response
    );

    if (result.success) {
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
      await loadData();
    } else {
      setSaveStatus("error");
    }
  };

  // アイテムを選択
  const handleSelectItem = async (itemId: string) => {
    await loadItem(itemId);
  };

  // 新規アイテムを作成
  const handleCreateItem = async (folderType: "base_talk" | "situational") => {
    // 適切なフォルダを見つける
    const targetFolder = allFolders.find((f) => f.folder_type === folderType);
    if (!targetFolder) {
      alert("フォルダが見つかりません。先にサンプルデータを作成してください。");
      return;
    }

    const result = await createItem(
      targetFolder.id,
      folderType === "base_talk" ? "新しい基本トーク" : "新しい武器",
      "ここに内容を入力してください",
      "",
      "",
      "",
      0
    );

    if (result.success && result.itemId) {
      await loadData();
      await loadItem(result.itemId);
      if (folderType === "base_talk") {
        setActiveTab("base");
      } else {
        setActiveTab("situational");
      }
    }
  };

  // 返答パターンを追加
  const handleAddResponse = async () => {
    if (!selectedItem) return;

    const responseText = prompt("顧客の想定返答を入力してください（例: 高いですね、間に合ってます）");
    if (!responseText) return;

    const result = await createItemResponse(selectedItem.id, responseText);
    if (result.success) {
      await loadItem(selectedItem.id);
      await loadData(); // 分岐数を更新
    }
  };

  // 分岐先に新規トークを作成
  const handleCreateBranchTalk = async (responseId: string) => {
    if (!selectedItem) return;

    // 空の新規アイテムを作成
    const result = await createItem(
      selectedItem.folder_id,
      "（分岐先トーク）",
      "ここにトーク内容を入力してください",
      "",
      "",
      "",
      selectedItem.sort_order + 1
    );

    if (result.success && result.itemId) {
      // 返答パターンに紐付け
      const response = responses.find((r) => r.id === responseId);
      if (response) {
        await updateItemResponse(responseId, response.response_text, result.itemId);
      }

      // 新しいアイテムを選択
      await loadData();
      await loadItem(result.itemId);
    }
  };

  // 既存トークを分岐先に設定
  const handleSelectExistingTalk = async (responseId: string, nextItemId: string) => {
    const response = responses.find((r) => r.id === responseId);
    if (response) {
      await updateItemResponse(responseId, response.response_text, nextItemId);
      await loadItem(selectedItem!.id);
      await loadData(); // 分岐数を更新
    }
  };

  // 返答パターンを削除
  const handleDeleteResponse = async (responseId: string) => {
    if (!confirm("この返答パターンを削除しますか？")) return;

    await deleteItemResponse(responseId);
    await loadItem(selectedItem!.id);
    await loadData(); // 分岐数を更新
  };

  // サンプルデータをシード
  const handleSeedWorkspace = async () => {
    if (!confirm("サンプルデータを作成しますか？")) return;

    const result = await seedWorkspace();
    if (result.success) {
      alert(`✅ ${result.message}`);
      await loadData();
    }
  };

  // 表示するアイテムをフィルタ
  const displayItems = allItems.filter((item) => {
    const folder = allFolders.find((f) => f.id === item.folder_id);
    if (!folder) return false;
    return activeTab === "base"
      ? folder.folder_type === "base_talk"
      : folder.folder_type === "situational";
  });

  // グループ化されたアイテム（分岐先選択用）
  const groupedItems = {
    base: allItems.filter((item) => {
      const folder = allFolders.find((f) => f.id === item.folder_id);
      return folder?.folder_type === "base_talk";
    }),
    situational: allItems.filter((item) => {
      const folder = allFolders.find((f) => f.id === item.folder_id);
      return folder?.folder_type === "situational";
    }),
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">📁 トークワークスペース（武器庫）</h1>
            <p className="text-sm opacity-90 mt-1">
              ここでトークと分岐を準備してください。コール画面では実行のみ。
            </p>
          </div>
          <div className="flex gap-2">
            {(!hierarchy || hierarchy.length === 0) && (
              <button
                onClick={handleSeedWorkspace}
                className="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-lg text-sm font-medium transition-colors"
              >
                🌱 サンプルデータ作成
              </button>
            )}
            <Link
              href="/call"
              className="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-lg text-sm font-medium transition-colors"
            >
              📞 コール画面へ
            </Link>
            <Link
              href="/"
              className="px-4 py-2 bg-white bg-opacity-10 hover:bg-opacity-20 text-white rounded-lg text-sm font-medium transition-colors"
            >
              ← ホーム
            </Link>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* 左ペイン: トーク一覧（タブ切り替え） */}
        <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
          {/* タブ */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab("base")}
              className={`flex-1 px-4 py-3 font-medium transition-colors ${
                activeTab === "base"
                  ? "bg-blue-50 text-blue-700 border-b-2 border-blue-600"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              📖 基本シナリオ
            </button>
            <button
              onClick={() => setActiveTab("situational")}
              className={`flex-1 px-4 py-3 font-medium transition-colors ${
                activeTab === "situational"
                  ? "bg-orange-50 text-orange-700 border-b-2 border-orange-600"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              🛡️ 武器庫
            </button>
          </div>

          {/* 新規作成ボタン */}
          <div className="p-4 border-b border-gray-200">
            <button
              onClick={() => handleCreateItem(activeTab === "base" ? "base_talk" : "situational")}
              className={`w-full px-4 py-3 rounded-lg font-medium transition-colors ${
                activeTab === "base"
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                  : "bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white"
              }`}
            >
              ➕ {activeTab === "base" ? "基本トークを追加" : "武器を追加"}
            </button>
          </div>

          {/* トーク一覧 */}
          <div className="flex-1 overflow-y-auto p-4">
            {displayItems.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <p className="mb-4">
                  {activeTab === "base" ? "基本シナリオ" : "武器庫"}がありません
                </p>
                <button
                  onClick={handleSeedWorkspace}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  🌱 サンプルデータ作成
                </button>
              </div>
            )}

            <div className="space-y-2">
              {displayItems.map((item) => {
                // 子トーク（next_item_idで参照されているもの）を判定
                const isChild = responses.some((r) => r.next_item_id === item.id);
                const branchCount = branchCounts.get(item.id) || 0;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectItem(item.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                      selectedItemId === item.id
                        ? activeTab === "base"
                          ? "bg-blue-100 border-2 border-blue-500 shadow-md"
                          : "bg-orange-100 border-2 border-orange-500 shadow-md"
                        : "bg-gray-50 hover:bg-gray-100 border border-gray-200"
                    } ${isChild ? "ml-6" : ""}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-medium text-gray-800">{item.title}</div>
                      {branchCount > 0 && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                          分岐 {branchCount}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {item.content.substring(0, 50)}...
                    </div>
                    {item.hearing_purpose && (
                      <div className="text-xs text-blue-600 mt-1 line-clamp-1">
                        🎯 {item.hearing_purpose.substring(0, 30)}...
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 右ペイン: 詳細編集 */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selectedItem ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-gray-500">
                <span className="text-6xl block mb-4">👈</span>
                <p className="text-lg">左からトークを選択してください</p>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto">
              {/* 3層構造の編集UI */}
              <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">トークの編集</h2>
                  {/* 保存状態インジケーター */}
                  <div className="flex items-center gap-2">
                    {saveStatus === "saving" && (
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium flex items-center gap-1">
                        <span className="animate-spin">⏳</span> 保存中...
                      </span>
                    )}
                    {saveStatus === "saved" && (
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium flex items-center gap-1">
                        <span>✅</span> 保存完了
                      </span>
                    )}
                    {saveStatus === "error" && (
                      <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium flex items-center gap-1">
                        <span>❌</span> エラー
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-sm text-gray-600 mb-6">
                  💡 入力後、自動的に保存されます（1秒後）
                </p>

                <div className="space-y-6">
                  {/* タイトル */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      タイトル
                    </label>
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                      placeholder="例: 時間確認、課題のヒアリング"
                    />
                  </div>

                  {/* 【1】ヒアリングすべき内容 */}
                  <div className="border-l-4 border-blue-500 pl-4 bg-blue-50 p-4 rounded-r-lg">
                    <label className="block text-sm font-bold text-blue-700 mb-2 flex items-center gap-2">
                      <span className="text-xl">🎯</span>
                      【1】ヒアリングすべき内容 / 目的
                    </label>
                    <textarea
                      value={editingHearingPurpose}
                      onChange={(e) => setEditingHearingPurpose(e.target.value)}
                      rows={3}
                      placeholder="例: 現状の集客ルートを確認する、時間的余裕を確認する"
                      className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                    />
                  </div>

                  {/* 【2】実際の聞き方 */}
                  <div className="border-l-4 border-green-500 pl-4 bg-green-50 p-4 rounded-r-lg">
                    <label className="block text-sm font-bold text-green-700 mb-2 flex items-center gap-2">
                      <span className="text-xl">🗣️</span>
                      【2】実際の聞き方（トーク本文）
                    </label>
                    <textarea
                      value={editingContent}
                      onChange={(e) => setEditingContent(e.target.value)}
                      rows={8}
                      placeholder="例: 今、2-3分ほどお時間よろしいでしょうか？"
                      className="w-full px-4 py-3 border-2 border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none resize-none text-lg"
                    />
                  </div>

                  {/* 【3】トップの狙い */}
                  <div className="border-l-4 border-purple-500 pl-4 bg-purple-50 p-4 rounded-r-lg">
                    <label className="block text-sm font-bold text-purple-700 mb-2 flex items-center gap-2">
                      <span className="text-xl">💡</span>
                      【3】トップの狙い（戦略メモ）
                    </label>
                    <textarea
                      value={editingStrategyNote}
                      onChange={(e) => setEditingStrategyNote(e.target.value)}
                      rows={4}
                      placeholder="例: 具体的な時間を提示することで、相手は「それくらいなら...」と思いやすい"
                      className="w-full px-4 py-3 border-2 border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none"
                    />
                  </div>

                  {/* カテゴリ選択 */}
                  <div className="border-l-4 border-indigo-500 pl-4 bg-indigo-50 p-4 rounded-r-lg">
                    <label className="block text-sm font-bold text-indigo-700 mb-2 flex items-center gap-2">
                      <span className="text-xl">📂</span>
                      カテゴリ（ジャンル分け）
                    </label>
                    <select
                      value={editingCategoryId}
                      onChange={(e) => {
                        setEditingCategoryId(e.target.value);
                        handleQuickSave({ category_id: e.target.value });
                      }}
                      className="w-full px-4 py-3 border-2 border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    >
                      <option value="">未分類</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-indigo-600 mt-2">
                      💡 カテゴリを設定すると、コール画面で分類表示されます
                    </p>
                  </div>

                  {/* Quick Response設定 */}
                  <div className="border-l-4 border-orange-500 pl-4 bg-orange-50 p-4 rounded-r-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-sm font-bold text-orange-700 mb-1 flex items-center gap-2">
                          <span className="text-xl">🛡️</span>
                          Quick Response（常備武器）に表示
                        </label>
                        <p className="text-xs text-orange-600">
                          ONにすると、コール画面の右側に常時表示されます（汎用性が高いトーク向け）
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          const newValue = editingIsQuickResponse === 1 ? 0 : 1;
                          setEditingIsQuickResponse(newValue);
                          handleQuickSave({ is_quick_response: newValue });
                        }}
                        className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                          editingIsQuickResponse === 1 ? "bg-orange-600" : "bg-gray-300"
                        }`}
                      >
                        <span
                          className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                            editingIsQuickResponse === 1 ? "translate-x-7" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 分岐管理UI */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-800">
                    🌳 顧客の返答パターンと分岐
                  </h2>
                  <button
                    onClick={handleAddResponse}
                    className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    ➕ 顧客の想定返答を追加
                  </button>
                </div>

                <p className="text-sm text-gray-600 mb-4">
                  💡 顧客が「こう言ったら、こう返す」というパターンを設定してください。
                  コール画面では、これらがボタンとして表示されます。
                </p>

                {responses.length === 0 && (
                  <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <p className="text-gray-500 mb-4">
                      まだ返答パターンがありません
                    </p>
                    <button
                      onClick={handleAddResponse}
                      className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                    >
                      ➕ 最初の返答パターンを追加
                    </button>
                  </div>
                )}

                <div className="space-y-4">
                  {responses.map((response, index) => {
                    const nextItem = response.next_item_id
                      ? allItems.find((item) => item.id === response.next_item_id)
                      : null;

                    return (
                      <div
                        key={response.id}
                        className="border-2 border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-bold">
                                顧客の返答 #{index + 1}
                              </span>
                            </div>
                            <p className="text-lg font-semibold text-gray-800">
                              「{response.response_text}」
                            </p>
                          </div>
                          <button
                            onClick={() => handleDeleteResponse(response.id)}
                            className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-sm font-medium transition-colors"
                          >
                            🗑️ 削除
                          </button>
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <p className="text-sm font-semibold text-gray-700 mb-2">
                            ↓ この返答が来たら、次に表示するトーク:
                          </p>

                          {nextItem ? (
                            <div className="p-3 bg-green-50 border-2 border-green-300 rounded-lg">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-semibold text-green-800">
                                    {nextItem.title}
                                  </p>
                                  <p className="text-sm text-green-600 mt-1">
                                    {nextItem.content.substring(0, 60)}...
                                  </p>
                                </div>
                                <button
                                  onClick={() => handleSelectItem(nextItem.id)}
                                  className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium transition-colors"
                                >
                                  編集 →
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <button
                                onClick={() => handleCreateBranchTalk(response.id)}
                                className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-medium transition-colors"
                              >
                                🆕 新しいトークを分岐先に作成する
                              </button>

                              {/* 既存トーク選択UI（グループ化） */}
                              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <p className="text-sm font-medium text-gray-700 mb-2">
                                  📋 既存のトークから選ぶ:
                                </p>
                                
                                {/* 基本シナリオ */}
                                {groupedItems.base.length > 0 && (
                                  <div className="mb-3">
                                    <p className="text-xs font-bold text-blue-600 mb-1">
                                      📖 基本シナリオ
                                    </p>
                                    <select
                                      onChange={(e) => {
                                        if (e.target.value) {
                                          handleSelectExistingTalk(response.id, e.target.value);
                                        }
                                      }}
                                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                      defaultValue=""
                                    >
                                      <option value="">選択してください...</option>
                                      {groupedItems.base.map((item) => (
                                        <option key={item.id} value={item.id}>
                                          {item.title}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}

                                {/* 武器庫 */}
                                {groupedItems.situational.length > 0 && (
                                  <div>
                                    <p className="text-xs font-bold text-orange-600 mb-1">
                                      🛡️ 武器庫
                                    </p>
                                    <select
                                      onChange={(e) => {
                                        if (e.target.value) {
                                          handleSelectExistingTalk(response.id, e.target.value);
                                        }
                                      }}
                                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                                      defaultValue=""
                                    >
                                      <option value="">選択してください...</option>
                                      {groupedItems.situational.map((item) => (
                                        <option key={item.id} value={item.id}>
                                          {item.title}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
