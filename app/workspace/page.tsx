"use client";

import { useState, useEffect } from "react";
import {
  getAllItems,
  getItemById,
  updateItem,
  createItem,
  getResponsesByItem,
  createItemResponse,
  updateItemResponse,
  deleteItemResponse,
  getAllFolders,
  getAllSituations,
  getAllCheckItems,
  getAllDynamicCategories,
  createDynamicCategory,
} from "@/src/actions/workspace-actions";
import type {
  ScriptItem,
  ItemResponse,
  ScriptFolder,
  Situation,
  CheckItem,
  Category,
} from "@/src/types/workspace";
import { useDebounce } from "@/src/hooks/useDebounce";
import Link from "next/link";

type SaveStatus = "idle" | "saving" | "saved" | "error";
type ItemTypeTab = "main_scenario" | "component";

export default function WorkspacePage() {
  const [allItems, setAllItems] = useState<ScriptItem[]>([]);
  const [allFolders, setAllFolders] = useState<ScriptFolder[]>([]);
  const [situations, setSituations] = useState<Situation[]>([]);
  const [checkItems, setCheckItems] = useState<CheckItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<ScriptItem | null>(null);
  const [responses, setResponses] = useState<ItemResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [activeTab, setActiveTab] = useState<ItemTypeTab>("main_scenario");

  // 編集中の値（デバウンス用）
  const [editingTitle, setEditingTitle] = useState("");
  const [editingHearingPurpose, setEditingHearingPurpose] = useState("");
  const [editingContent, setEditingContent] = useState("");
  const [editingStrategyNote, setEditingStrategyNote] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string>("");
  const [editingIsQuickResponse, setEditingIsQuickResponse] = useState<number>(0);
  const [editingTargetSituationId, setEditingTargetSituationId] = useState<string>("");
  const [editingTriggerCheckItemId, setEditingTriggerCheckItemId] = useState<string>("");

  // デバウンス後の値
  const debouncedTitle = useDebounce(editingTitle, 1000);
  const debouncedHearingPurpose = useDebounce(editingHearingPurpose, 1000);
  const debouncedContent = useDebounce(editingContent, 1000);
  const debouncedStrategyNote = useDebounce(editingStrategyNote, 1000);

  // 分岐数カウント
  const [branchCounts, setBranchCounts] = useState<{ [key: string]: number }>({});

  // データを読み込む
  const loadData = async () => {
    setLoading(true);
    const [items, folders, sits, chks, cats] = await Promise.all([
      getAllItems(),
      getAllFolders(),
      getAllSituations(),
      getAllCheckItems(),
      getAllDynamicCategories(),
    ]);

    setAllItems(items);
    setAllFolders(folders);
    setSituations(sits);
    setCheckItems(chks);
    setCategories(cats);

    // 分岐数をカウント
    const counts: { [key: string]: number } = {};
    for (const item of items) {
      const itemResponses = await getResponsesByItem(item.id);
      counts[item.id] = itemResponses.length;
    }
    setBranchCounts(counts);

    setLoading(false);
  };

  // アイテムを選択
  const loadItem = async (itemId: string) => {
    setSelectedItemId(itemId);
    const item = await getItemById(itemId);
    if (item) {
      setSelectedItem(item);
      setEditingTitle(item.title);
      setEditingHearingPurpose(item.hearing_purpose || "");
      setEditingContent(item.content);
      setEditingStrategyNote(item.strategy_note || "");
      setEditingCategoryId(item.category_id || "");
      setEditingIsQuickResponse(item.is_quick_response || 0);
      setEditingTargetSituationId(item.target_situation_id || "");
      setEditingTriggerCheckItemId(item.trigger_check_item_id || "");

      const itemResponses = await getResponsesByItem(itemId);
      setResponses(itemResponses);
    }
  };

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
      editingIsQuickResponse,
      selectedItem.item_type,
      editingTargetSituationId || undefined,
      editingTriggerCheckItemId || undefined
    );

    if (result.success) {
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
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
      updates.is_quick_response ?? selectedItem.is_quick_response,
      updates.item_type ?? selectedItem.item_type,
      updates.target_situation_id ?? selectedItem.target_situation_id,
      updates.trigger_check_item_id ?? selectedItem.trigger_check_item_id
    );

    if (result.success) {
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
      await loadData();
      if (selectedItemId) {
        await loadItem(selectedItemId);
      }
    } else {
      setSaveStatus("error");
    }
  };

  // デバウンスされた値が変更されたら自動保存
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

  // 新規アイテムを作成
  const handleCreateItem = async () => {
    const defaultFolder = allFolders.find((f) => f.folder_type === "base_talk");
    if (!defaultFolder) {
      alert("フォルダが見つかりません");
      return;
    }

    const itemType = activeTab; // "main_scenario" or "component"
    const result = await createItem(
      defaultFolder.id,
      "新しいトーク",
      "内容を入力してください",
      "",
      "",
      "",
      itemType
    );

    if (result.success && result.itemId) {
      await loadData();
      await loadItem(result.itemId);
    }
  };

  // 返答パターンを追加
  const handleAddResponse = async () => {
    if (!selectedItem) return;

    const result = await createItemResponse(selectedItem.id, "新しい返答", undefined, responses.length);
    if (result.success) {
      const itemResponses = await getResponsesByItem(selectedItem.id);
      setResponses(itemResponses);
    }
  };

  // 返答パターンを更新
  const handleUpdateResponse = async (responseId: string, text: string, nextId?: string) => {
    await updateItemResponse(responseId, text, nextId);
    const itemResponses = await getResponsesByItem(selectedItem!.id);
    setResponses(itemResponses);
  };

  // 返答パターンを削除
  const handleDeleteResponse = async (responseId: string) => {
    if (!confirm("この返答パターンを削除しますか？")) return;
    await deleteItemResponse(responseId);
    const itemResponses = await getResponsesByItem(selectedItem!.id);
    setResponses(itemResponses);
  };

  // 新しい分岐トークを作成
  const handleCreateBranchTalk = async (responseId: string) => {
    const defaultFolder = allFolders.find((f) => f.folder_type === "base_talk");
    if (!defaultFolder) return;

    const result = await createItem(
      defaultFolder.id,
      "分岐先トーク",
      "内容を入力してください",
      "",
      "",
      "",
      "component" // 分岐先は部品トークとして作成
    );

    if (result.success && result.itemId) {
      await handleUpdateResponse(
        responseId,
        responses.find((r) => r.id === responseId)?.response_text || "",
        result.itemId
      );
      await loadData();
      await loadItem(result.itemId);
      setActiveTab("component"); // 部品トークタブに切り替え
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 表示するアイテム
  const displayItems = allItems.filter((item) => item.item_type === activeTab);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">🛠️ ワークスペース（V3対応版）</h1>
            <p className="text-sm opacity-90 mt-1">
              💡 基本シナリオと部品トークを作成・管理できます
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/call-v3"
              className="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-lg text-sm font-medium transition-colors"
            >
              📞 コール画面V3へ
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

      {/* 2ペインレイアウト */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* 左ペイン: トークリスト */}
        <div className="w-96 bg-white border-r-2 border-gray-200 flex flex-col shadow-lg">
          {/* タブ切り替え */}
          <div className="flex border-b-2 border-gray-200">
            <button
              onClick={() => setActiveTab("main_scenario")}
              className={`flex-1 px-4 py-3 font-bold transition-colors ${
                activeTab === "main_scenario"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              📖 基本シナリオ
            </button>
            <button
              onClick={() => setActiveTab("component")}
              className={`flex-1 px-4 py-3 font-bold transition-colors ${
                activeTab === "component"
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              🧩 部品トーク
            </button>
          </div>

          {/* 説明テキスト */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200">
            {activeTab === "main_scenario" ? (
              <div>
                <h3 className="font-bold text-blue-800 mb-1">📖 基本シナリオとは？</h3>
                <p className="text-sm text-blue-700">
                  代表突破〜担当者接続までの固定トークです。コール画面V3では常に左端のタブに表示されます。
                </p>
              </div>
            ) : (
              <div>
                <h3 className="font-bold text-green-800 mb-1">🧩 部品トークとは？</h3>
                <p className="text-sm text-green-700">
                  状況タグやチェック項目に紐付けて、動的に表示するトークです。
                </p>
              </div>
            )}
          </div>

          {/* 新規作成ボタン */}
          <div className="p-4 border-b-2 border-gray-200">
            <button
              onClick={handleCreateItem}
              className={`w-full px-4 py-3 bg-gradient-to-r ${
                activeTab === "main_scenario"
                  ? "from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  : "from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              } text-white rounded-lg font-bold transition-all shadow-md hover:shadow-lg`}
            >
              ➕ {activeTab === "main_scenario" ? "基本トーク" : "部品トーク"}を追加
            </button>
          </div>

          {/* トークリスト */}
          <div className="flex-1 overflow-y-auto p-4">
            {displayItems.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p className="mb-2">まだトークがありません</p>
                <p className="text-sm">上のボタンから作成してください</p>
              </div>
            )}
            <div className="space-y-2">
              {displayItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => loadItem(item.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                    selectedItemId === item.id
                      ? activeTab === "main_scenario"
                        ? "bg-blue-100 border-2 border-blue-500 shadow-md"
                        : "bg-green-100 border-2 border-green-500 shadow-md"
                      : "bg-white border-2 border-gray-200 hover:border-gray-400 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-gray-800 text-sm">{item.title}</h4>
                    {branchCounts[item.id] > 0 && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                        分岐 {branchCounts[item.id]}
                      </span>
                    )}
                  </div>
                  {item.hearing_purpose && (
                    <p className="text-xs text-blue-600 mt-1">🎯 {item.hearing_purpose}</p>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 右ペイン: エディター */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selectedItem ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-gray-500">
                <span className="text-6xl mb-4 block">👈</span>
                <p className="text-lg">左からトークを選択してください</p>
              </div>
            </div>
          ) : (
            <div className="max-w-5xl mx-auto space-y-6">
              {/* 保存ステータス */}
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-800">
                  {selectedItem.item_type === "main_scenario" ? "📖 基本シナリオ" : "🧩 部品トーク"}編集
                </h2>
                <div className="text-sm font-medium">
                  {saveStatus === "saving" && <span className="text-blue-600">⏳ 保存中...</span>}
                  {saveStatus === "saved" && <span className="text-green-600">✅ 保存完了</span>}
                  {saveStatus === "error" && <span className="text-red-600">❌ エラー</span>}
                </div>
              </div>

              {/* トーク編集フォーム */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4">トーク内容（3層構造）</h3>

                <div className="space-y-4">
                  {/* タイトル */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      トークタイトル（必須）
                    </label>
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      placeholder="例: 時間確認と挨拶"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
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
                </div>
              </div>

              {/* 部品トーク専用設定 */}
              {selectedItem.item_type === "component" && (
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-4">🧩 部品トーク設定</h3>

                  <div className="space-y-4">
                    {/* 状況タグに紐付け */}
                    <div className="border-l-4 border-indigo-500 pl-4 bg-indigo-50 p-4 rounded-r-lg">
                      <label className="block text-sm font-bold text-indigo-700 mb-2 flex items-center gap-2">
                        <span className="text-xl">🎬</span>
                        状況タグに紐付け（任意）
                      </label>
                      <select
                        value={editingTargetSituationId}
                        onChange={(e) => {
                          setEditingTargetSituationId(e.target.value);
                          handleQuickSave({ target_situation_id: e.target.value || undefined });
                        }}
                        className="w-full px-4 py-3 border-2 border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                      >
                        <option value="">紐付けなし</option>
                        {situations.map((sit) => (
                          <option key={sit.id} value={sit.id}>
                            {sit.icon} {sit.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-indigo-600 mt-2">
                        💡 コール画面でこの状況タブを選択した時に表示されます
                      </p>
                    </div>

                    {/* チェック項目に紐付け */}
                    <div className="border-l-4 border-green-500 pl-4 bg-green-50 p-4 rounded-r-lg">
                      <label className="block text-sm font-bold text-green-700 mb-2 flex items-center gap-2">
                        <span className="text-xl">✅</span>
                        チェック項目に紐付け（任意）
                      </label>
                      <select
                        value={editingTriggerCheckItemId}
                        onChange={(e) => {
                          setEditingTriggerCheckItemId(e.target.value);
                          handleQuickSave({ trigger_check_item_id: e.target.value || undefined });
                        }}
                        className="w-full px-4 py-3 border-2 border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                      >
                        <option value="">紐付けなし</option>
                        {checkItems.map((check) => (
                          <option key={check.id} value={check.id}>
                            {check.name} {check.category && `(${check.category})`}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-green-600 mt-2">
                        💡 コール画面でこのチェック項目をONにした時に動的に追加されます
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* カテゴリとQuick Response設定 */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4">その他の設定</h3>

                <div className="space-y-4">
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
                          ONにすると、コール画面の右下に常時表示されます
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
                </p>

                <div className="space-y-4">
                  {responses.map((response) => {
                    const nextItem = allItems.find((item) => item.id === response.next_item_id);
                    return (
                      <div key={response.id} className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 mr-3">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              顧客の返答テキスト
                            </label>
                            <input
                              type="text"
                              value={response.response_text}
                              onChange={(e) =>
                                handleUpdateResponse(response.id, e.target.value, response.next_item_id)
                              }
                              placeholder="例: 忙しいです"
                              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <button
                            onClick={() => handleDeleteResponse(response.id)}
                            className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
                          >
                            削除
                          </button>
                        </div>

                        <div className="pl-4 border-l-4 border-blue-300">
                          <p className="text-sm font-medium text-gray-700 mb-2">↓ 分岐先のトーク:</p>
                          {nextItem ? (
                            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                              <p className="font-bold text-blue-800">{nextItem.title}</p>
                              <p className="text-sm text-blue-600 truncate">{nextItem.content}</p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <button
                                onClick={() => handleCreateBranchTalk(response.id)}
                                className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-bold transition-all"
                              >
                                🆕 新しいトークを分岐先に作成する
                              </button>
                              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <p className="text-sm font-medium text-gray-700 mb-2">
                                  📋 既存のトークから選ぶ:
                                </p>
                                <select
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      handleUpdateResponse(response.id, response.response_text, e.target.value);
                                    }
                                  }}
                                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="">選択してください...</option>
                                  {allItems.map((item) => (
                                    <option key={item.id} value={item.id}>
                                      {item.item_type === "main_scenario" ? "📖" : "🧩"} {item.title}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {responses.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-sm">まだ返答パターンがありません</p>
                      <p className="text-xs mt-2">上のボタンから追加してください</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
