"use client";

import { useState, useEffect } from "react";
import { useDebounce } from "@/src/hooks/useDebounce";
import {
  getAllItems,
  getItemById,
  updateItem,
  createItem,
  deleteItem,
  getResponsesByItem,
  createItemResponse,
  updateItemResponse,
  deleteItemResponse,
  getAllFolders,
  getAllSituations,
  createSituation,
  updateSituation,
  deleteSituation,
  getAllCheckItems,
  createCheckItem,
  updateCheckItem,
  deleteCheckItem,
  getAllDynamicCategories,
  createDynamicCategory,
  getAllTimelines,
  createTimelineWithSituation,
  deleteTimeline,
  getTimelineBlocks,
  addItemToTimeline,
  removeBlockFromTimeline,
  getTimelineCheckItems,
  addCheckItemToTimeline,
  removeCheckItemFromTimeline,
} from "@/src/actions/workspace-actions";
import type {
  ScriptItem,
  ItemResponse,
  ScriptFolder,
  Situation,
  CheckItem,
  Category,
  Timeline,
} from "@/src/types/workspace";
import Link from "next/link";

type MenuTab =
  | "main_scenario"
  | "component"
  | "situations"
  | "categories"
  | "checks"
  | "timelines";

export default function WorkspacePage() {
  const [activeMenu, setActiveMenu] = useState<MenuTab>("main_scenario");
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  // データ
  const [allItems, setAllItems] = useState<ScriptItem[]>([]);
  const [allFolders, setAllFolders] = useState<ScriptFolder[]>([]);
  const [situations, setSituations] = useState<Situation[]>([]);
  const [checkItems, setCheckItems] = useState<CheckItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [timelines, setTimelines] = useState<Timeline[]>([]);

  // 編集中のアイテム
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<ScriptItem | null>(null);
  const [responses, setResponses] = useState<ItemResponse[]>([]);

  // 編集中の値
  const [editingTitle, setEditingTitle] = useState("");
  const [editingHearingPurpose, setEditingHearingPurpose] = useState("");
  const [editingContent, setEditingContent] = useState("");
  const [editingStrategyNote, setEditingStrategyNote] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string>("");
  const [editingIsQuickResponse, setEditingIsQuickResponse] = useState<number>(0);
  const [editingTargetSituationId, setEditingTargetSituationId] = useState<string>("");
  const [editingTriggerCheckItemId, setEditingTriggerCheckItemId] = useState<string>("");

  // デバウンス（1秒後に保存）
  const debouncedTitle = useDebounce(editingTitle, 1000);
  const debouncedHearingPurpose = useDebounce(editingHearingPurpose, 1000);
  const debouncedContent = useDebounce(editingContent, 1000);
  const debouncedStrategyNote = useDebounce(editingStrategyNote, 1000);
  const debouncedCategoryId = useDebounce(editingCategoryId, 1000);
  const debouncedIsQuickResponse = useDebounce(editingIsQuickResponse, 1000);
  const debouncedTargetSituationId = useDebounce(editingTargetSituationId, 1000);
  const debouncedTriggerCheckItemId = useDebounce(editingTriggerCheckItemId, 1000);

  // データを読み込む
  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    const [items, folders, sits, chks, cats, tls] = await Promise.all([
      getAllItems(),
      getAllFolders(),
      getAllSituations(),
      getAllCheckItems(),
      getAllDynamicCategories(),
      getAllTimelines(),
    ]);

    setAllItems(items);
    setAllFolders(folders);
    setSituations(sits);
    setCheckItems(chks);
    setCategories(cats);
    setTimelines(tls);

    if (!silent) setLoading(false);
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
  useEffect(() => {
    if (!selectedItem) return;

    const autoSave = async () => {
      setSaveStatus("saving");
      
      await updateItem(
        selectedItem.id,
        debouncedTitle,
        debouncedContent,
        debouncedHearingPurpose,
        debouncedStrategyNote,
        selectedItem.next_move_hint,
        debouncedCategoryId || undefined,
        debouncedIsQuickResponse,
        selectedItem.item_type,
        debouncedTargetSituationId || undefined,
        debouncedTriggerCheckItemId || undefined
      );

      // 楽観的UIアップデート（ローカル状態を更新）
      setAllItems((prev) =>
        prev.map((item) =>
          item.id === selectedItem.id
            ? {
                ...item,
                title: debouncedTitle,
                content: debouncedContent,
                hearing_purpose: debouncedHearingPurpose,
                strategy_note: debouncedStrategyNote,
                category_id: debouncedCategoryId || undefined,
                is_quick_response: debouncedIsQuickResponse,
                target_situation_id: debouncedTargetSituationId || undefined,
                trigger_check_item_id: debouncedTriggerCheckItemId || undefined,
              }
            : item
        )
      );

      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    };

    autoSave();
  }, [
    debouncedTitle,
    debouncedHearingPurpose,
    debouncedContent,
    debouncedStrategyNote,
    debouncedCategoryId,
    debouncedIsQuickResponse,
    debouncedTargetSituationId,
    debouncedTriggerCheckItemId,
    selectedItem,
  ]);

  // 新規アイテムを作成
  const handleCreateItem = async (itemType: "main_scenario" | "component") => {
    const defaultFolder = allFolders.find((f) => f.folder_type === "base_talk");
    if (!defaultFolder) {
      alert("フォルダが見つかりません");
      return;
    }

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
      await loadData(true);
      await loadItem(result.itemId);
      setActiveMenu(itemType);
    }
  };

  // アイテムを削除
  const handleDeleteItem = async (itemId: string) => {
    if (!confirm("このトークを削除しますか？")) return;
    await deleteItem(itemId);
    setSelectedItem(null);
    setSelectedItemId(null);
    await loadData(true);
  };

  // 返答パターンを追加
  const handleAddResponse = async () => {
    if (!selectedItem) return;
    const result = await createItemResponse(
      selectedItem.id,
      "新しい返答",
      undefined,
      responses.length
    );
    if (result.success) {
      const itemResponses = await getResponsesByItem(selectedItem.id);
      setResponses(itemResponses);
    }
  };

  // 返答パターンを更新
  const handleUpdateResponse = async (
    responseId: string,
    text: string,
    nextId?: string
  ) => {
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
      "component"
    );

    if (result.success && result.itemId) {
      await handleUpdateResponse(
        responseId,
        responses.find((r) => r.id === responseId)?.response_text || "",
        result.itemId
      );
      await loadData(true);
      await loadItem(result.itemId);
      setActiveMenu("component");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const displayItems =
    activeMenu === "main_scenario" || activeMenu === "component"
      ? allItems.filter((item) => item.item_type === activeMenu)
      : [];

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
            <h1 className="text-2xl font-bold">🛠️ ワークスペース（統合版）</h1>
            <p className="text-sm opacity-90 mt-1">
              💡 すべての設定を一箇所で管理 | 自動保存対応
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* 保存状態インジケーター */}
            {selectedItem && (
              <div className="flex items-center gap-2 bg-white bg-opacity-20 px-4 py-2 rounded-lg">
                {saveStatus === "saving" && (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    <span className="text-sm font-medium">保存中...</span>
                  </>
                )}
                {saveStatus === "saved" && (
                  <>
                    <span className="text-green-300 text-xl">✓</span>
                    <span className="text-sm font-medium">保存完了</span>
                  </>
                )}
                {saveStatus === "idle" && (
                  <span className="text-sm font-medium opacity-70">編集可能</span>
                )}
              </div>
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

      {/* メニュータブ */}
      <div className="bg-white border-b-2 border-gray-200 shadow-md overflow-x-auto">
        <div className="flex min-w-max">
          <MenuButton
            active={activeMenu === "main_scenario"}
            onClick={() => setActiveMenu("main_scenario")}
            icon="📖"
            label="基本シナリオ"
          />
          <MenuButton
            active={activeMenu === "component"}
            onClick={() => setActiveMenu("component")}
            icon="🧩"
            label="部品トーク"
          />
          <MenuButton
            active={activeMenu === "timelines"}
            onClick={() => setActiveMenu("timelines")}
            icon="🎯"
            label="組み合わせトーク"
          />
          <MenuButton
            active={activeMenu === "situations"}
            onClick={() => setActiveMenu("situations")}
            icon="🎬"
            label="状況タグ"
          />
          <MenuButton
            active={activeMenu === "checks"}
            onClick={() => setActiveMenu("checks")}
            icon="✅"
            label="チェック項目"
          />
          <MenuButton
            active={activeMenu === "categories"}
            onClick={() => setActiveMenu("categories")}
            icon="📂"
            label="カテゴリ"
          />
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="max-w-7xl mx-auto p-6">
        {/* トーク編集画面 */}
        {(activeMenu === "main_scenario" || activeMenu === "component") && (
          <TalkEditor
            activeMenu={activeMenu}
            displayItems={displayItems}
            selectedItem={selectedItem}
            editingTitle={editingTitle}
            editingHearingPurpose={editingHearingPurpose}
            editingContent={editingContent}
            editingStrategyNote={editingStrategyNote}
            editingCategoryId={editingCategoryId}
            editingIsQuickResponse={editingIsQuickResponse}
            editingTargetSituationId={editingTargetSituationId}
            editingTriggerCheckItemId={editingTriggerCheckItemId}
            situations={situations}
            checkItems={checkItems}
            categories={categories}
            responses={responses}
            allItems={allItems}
            saveStatus={saveStatus}
            onSelectItem={loadItem}
            onCreateItem={handleCreateItem}
            onDeleteItem={handleDeleteItem}
            onChangeTitle={setEditingTitle}
            onChangeHearingPurpose={setEditingHearingPurpose}
            onChangeContent={setEditingContent}
            onChangeStrategyNote={setEditingStrategyNote}
            onChangeCategoryId={setEditingCategoryId}
            onChangeIsQuickResponse={setEditingIsQuickResponse}
            onChangeTargetSituationId={setEditingTargetSituationId}
            onChangeTriggerCheckItemId={setEditingTriggerCheckItemId}
            onAddResponse={handleAddResponse}
            onUpdateResponse={handleUpdateResponse}
            onDeleteResponse={handleDeleteResponse}
            onCreateBranchTalk={handleCreateBranchTalk}
          />
        )}

        {/* 組み合わせトーク管理 */}
        {activeMenu === "timelines" && (
          <TimelineManager
            timelines={timelines}
            situations={situations}
            talks={allItems}
            checkItems={checkItems}
            onUpdate={() => loadData(true)}
          />
        )}

        {/* 状況タグ管理 */}
        {activeMenu === "situations" && (
          <SituationManager situations={situations} onUpdate={() => loadData(true)} />
        )}

        {/* チェック項目管理 */}
        {activeMenu === "checks" && (
          <CheckItemManager checkItems={checkItems} onUpdate={() => loadData(true)} />
        )}

        {/* カテゴリ管理 */}
        {activeMenu === "categories" && (
          <CategoryManager categories={categories} onUpdate={() => loadData(true)} />
        )}
      </div>
    </div>
  );
}

// メニューボタン
function MenuButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-4 font-bold transition-all whitespace-nowrap ${
        active
          ? "bg-indigo-600 text-white border-b-4 border-indigo-800"
          : "bg-white text-gray-700 hover:bg-gray-100"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-xl">{icon}</span>
        <span>{label}</span>
      </div>
    </button>
  );
}

// トークエディター
function TalkEditor({
  activeMenu,
  displayItems,
  selectedItem,
  editingTitle,
  editingHearingPurpose,
  editingContent,
  editingStrategyNote,
  editingCategoryId,
  editingIsQuickResponse,
  editingTargetSituationId,
  editingTriggerCheckItemId,
  situations,
  checkItems,
  categories,
  responses,
  allItems,
  saveStatus,
  onSelectItem,
  onCreateItem,
  onDeleteItem,
  onChangeTitle,
  onChangeHearingPurpose,
  onChangeContent,
  onChangeStrategyNote,
  onChangeCategoryId,
  onChangeIsQuickResponse,
  onChangeTargetSituationId,
  onChangeTriggerCheckItemId,
  onAddResponse,
  onUpdateResponse,
  onDeleteResponse,
  onCreateBranchTalk,
}: any) {
  return (
    <div className="flex gap-6">
      {/* 左: リスト */}
      <div className="w-96 bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">
            {activeMenu === "main_scenario" ? "📖 基本シナリオ" : "🧩 部品トーク"}
          </h2>
          <button
            onClick={() => onCreateItem(activeMenu)}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-bold transition-all text-sm"
          >
            ➕ 追加
          </button>
        </div>

        {displayItems.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-sm">まだトークがありません</p>
          </div>
        )}

        <div className="space-y-2">
          {displayItems.map((item: ScriptItem) => (
            <div
              key={item.id}
              className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                selectedItem?.id === item.id
                  ? "bg-blue-100 border-2 border-blue-500"
                  : "bg-gray-50 border-2 border-gray-200 hover:border-blue-300"
              }`}
            >
              <div className="flex-1" onClick={() => onSelectItem(item.id)}>
                <h4 className="font-bold text-gray-800 text-sm">{item.title}</h4>
                {item.hearing_purpose && (
                  <p className="text-xs text-blue-600 mt-1">🎯 {item.hearing_purpose}</p>
                )}
              </div>
              <button
                onClick={() => onDeleteItem(item.id)}
                className="ml-2 px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs font-bold transition-colors"
              >
                削除
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 右: エディター */}
      <div className="flex-1 bg-white rounded-xl shadow-lg p-6">
        {!selectedItem ? (
          <div className="h-full flex items-center justify-center text-gray-500">
            <div className="text-center">
              <span className="text-6xl mb-4 block">👈</span>
              <p className="text-lg">左からトークを選択してください</p>
              <p className="text-sm mt-2 opacity-70">編集内容は自動的に保存されます</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 保存状態インジケーター */}
            <div className="flex items-center justify-end">
              {saveStatus === "saving" && (
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                  <span className="text-sm font-medium text-blue-800">保存中...</span>
                </div>
              )}
              {saveStatus === "saved" && (
                <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-lg border border-green-200">
                  <span className="text-green-600 text-xl">✓</span>
                  <span className="text-sm font-medium text-green-800">保存完了</span>
                </div>
              )}
            </div>

            {/* トーク編集フォーム */}
            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-4">トーク内容</h3>

              <div className="space-y-4">
                {/* タイトル */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    タイトル（必須）
                  </label>
                  <input
                    type="text"
                    value={editingTitle}
                    onChange={(e) => onChangeTitle(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="トークのタイトルを入力..."
                  />
                </div>

                {/* 3層構造 */}
                <div className="border-l-4 border-blue-500 pl-4 bg-blue-50 p-4 rounded-r-lg">
                  <label className="block text-sm font-bold text-blue-700 mb-2">
                    🎯 ヒアリングすべき内容
                  </label>
                  <textarea
                    value={editingHearingPurpose}
                    onChange={(e) => onChangeHearingPurpose(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="このトークの目的を入力..."
                  />
                </div>

                <div className="border-l-4 border-green-500 pl-4 bg-green-50 p-4 rounded-r-lg">
                  <label className="block text-sm font-bold text-green-700 mb-2">
                    🗣️ 実際の聞き方
                  </label>
                  <textarea
                    value={editingContent}
                    onChange={(e) => onChangeContent(e.target.value)}
                    rows={8}
                    className="w-full px-4 py-3 border-2 border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg transition-all"
                    placeholder="実際に話すトーク内容を入力..."
                  />
                </div>

                <div className="border-l-4 border-purple-500 pl-4 bg-purple-50 p-4 rounded-r-lg">
                  <label className="block text-sm font-bold text-purple-700 mb-2">
                    💡 トップの狙い
                  </label>
                  <textarea
                    value={editingStrategyNote}
                    onChange={(e) => onChangeStrategyNote(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 border-2 border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                    placeholder="このトークの戦略的意図を入力..."
                  />
                </div>
              </div>
            </div>

            {/* 部品トーク設定 */}
            {selectedItem.item_type === "component" && (
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-4">🧩 部品トーク設定</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      🎬 状況タグに紐付け
                    </label>
                    <select
                      value={editingTargetSituationId}
                      onChange={(e) => onChangeTargetSituationId(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    >
                      <option value="">紐付けなし</option>
                      {situations.map((sit: Situation) => (
                        <option key={sit.id} value={sit.id}>
                          {sit.icon} {sit.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      ✅ チェック項目に紐付け
                    </label>
                    <select
                      value={editingTriggerCheckItemId}
                      onChange={(e) => onChangeTriggerCheckItemId(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    >
                      <option value="">紐付けなし</option>
                      {checkItems.map((check: CheckItem) => (
                        <option key={check.id} value={check.id}>
                          {check.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* その他の設定 */}
            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-4">その他の設定</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    📂 カテゴリ
                  </label>
                  <select
                    value={editingCategoryId}
                    onChange={(e) => onChangeCategoryId(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  >
                    <option value="">未分類</option>
                    {categories.map((cat: Category) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border-2 border-orange-200">
                  <div>
                    <label className="block text-sm font-bold text-orange-700">
                      🛡️ Quick Response（武器庫）に表示
                    </label>
                    <p className="text-xs text-orange-600 mt-1">
                      コール画面の右下に常時表示
                    </p>
                  </div>
                  <button
                    onClick={() => onChangeIsQuickResponse(editingIsQuickResponse === 1 ? 0 : 1)}
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

            {/* 分岐管理 */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800">🌳 返答パターンと分岐</h3>
                <button
                  onClick={onAddResponse}
                  className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-bold text-sm transition-all"
                >
                  ➕ 返答を追加
                </button>
              </div>

              {responses.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">まだ返答パターンがありません</p>
                </div>
              )}

              <div className="space-y-4">
                {responses.map((response: ItemResponse) => {
                  const nextItem = allItems.find((item: ScriptItem) => item.id === response.next_item_id);
                  return (
                    <div
                      key={response.id}
                      className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <input
                          type="text"
                          value={response.response_text}
                          onChange={(e) =>
                            onUpdateResponse(response.id, e.target.value, response.next_item_id)
                          }
                          placeholder="顧客の返答（例: 忙しいです）"
                          className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mr-3 transition-all"
                        />
                        <button
                          onClick={() => onDeleteResponse(response.id)}
                          className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-bold transition-colors"
                        >
                          削除
                        </button>
                      </div>

                      <div className="pl-4 border-l-4 border-blue-300">
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          ↓ 分岐先のトーク:
                        </p>
                        {nextItem ? (
                          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="font-bold text-blue-800">{nextItem.title}</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <button
                              onClick={() => onCreateBranchTalk(response.id)}
                              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm transition-colors"
                            >
                              🆕 新しいトークを作成
                            </button>
                            <select
                              onChange={(e) => {
                                if (e.target.value) {
                                  onUpdateResponse(
                                    response.id,
                                    response.response_text,
                                    e.target.value
                                  );
                                }
                              }}
                              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
                            >
                              <option value="">既存から選択...</option>
                              {allItems.map((item: ScriptItem) => (
                                <option key={item.id} value={item.id}>
                                  {item.item_type === "main_scenario" ? "📖" : "🧩"} {item.title}
                                </option>
                              ))}
                            </select>
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
  );
}

// 状況タグ管理
function SituationManager({
  situations,
  onUpdate,
}: {
  situations: Situation[];
  onUpdate: () => void;
}) {
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("📌");
  const [newColor, setNewColor] = useState("#3B82F6");

  const handleCreate = async () => {
    if (!newName.trim()) {
      alert("名前を入力してください");
      return;
    }
    await createSituation(newName, "", newIcon, newColor);
    setNewName("");
    setNewIcon("📌");
    setNewColor("#3B82F6");
    onUpdate();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("この状況タグを削除しますか？")) return;
    await deleteSituation(id);
    onUpdate();
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">🎬 状況タグ管理</h2>

        {/* 新規作成フォーム */}
        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <h3 className="font-bold text-blue-800 mb-3">➕ 新しい状況タグを追加</h3>
          <div className="grid grid-cols-4 gap-3">
            <input
              type="text"
              value={newIcon}
              onChange={(e) => setNewIcon(e.target.value)}
              placeholder="📌"
              maxLength={2}
              className="px-4 py-2 border-2 border-blue-300 rounded-lg text-center"
            />
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="h-12 border-2 border-blue-300 rounded-lg"
            />
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="例: ヒアリング時"
              className="col-span-2 px-4 py-2 border-2 border-blue-300 rounded-lg"
            />
          </div>
          <button
            onClick={handleCreate}
            className="mt-3 w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-colors"
          >
            追加する
          </button>
        </div>

        {/* 一覧 */}
        <div className="space-y-2">
          {situations.length === 0 && (
            <p className="text-center py-8 text-gray-500">まだ状況タグがありません</p>
          )}
          {situations.map((sit) => (
            <div
              key={sit.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border-2 border-gray-200"
              style={{ borderLeftWidth: "6px", borderLeftColor: sit.color }}
            >
              <div className="flex items-center gap-4">
                <span className="text-3xl">{sit.icon}</span>
                <div>
                  <h4 className="font-bold text-gray-800">{sit.name}</h4>
                  {sit.description && <p className="text-sm text-gray-600">{sit.description}</p>}
                </div>
              </div>
              <button
                onClick={() => handleDelete(sit.id)}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-bold transition-colors"
              >
                削除
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// チェック項目管理
function CheckItemManager({
  checkItems,
  onUpdate,
}: {
  checkItems: CheckItem[];
  onUpdate: () => void;
}) {
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("");

  const handleCreate = async () => {
    if (!newName.trim()) {
      alert("名前を入力してください");
      return;
    }
    await createCheckItem(newName, "", newCategory);
    setNewName("");
    setNewCategory("");
    onUpdate();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("このチェック項目を削除しますか？")) return;
    await deleteCheckItem(id);
    onUpdate();
  };

  // カテゴリ別にグループ化
  const groupedItems: { [category: string]: CheckItem[] } = {};
  checkItems.forEach((item) => {
    const cat = item.category || "未分類";
    if (!groupedItems[cat]) {
      groupedItems[cat] = [];
    }
    groupedItems[cat].push(item);
  });

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">✅ チェック項目管理</h2>

        {/* 新規作成フォーム */}
        <div className="bg-green-50 rounded-lg p-4 mb-6">
          <h3 className="font-bold text-green-800 mb-3">➕ 新しいチェック項目を追加</h3>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="例: 予算の確認"
              className="px-4 py-2 border-2 border-green-300 rounded-lg"
            />
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="カテゴリ（例: BANT）"
              className="px-4 py-2 border-2 border-green-300 rounded-lg"
            />
          </div>
          <button
            onClick={handleCreate}
            className="mt-3 w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition-colors"
          >
            追加する
          </button>
        </div>

        {/* 一覧（カテゴリ別） */}
        <div className="space-y-4">
          {Object.keys(groupedItems).length === 0 && (
            <p className="text-center py-8 text-gray-500">まだチェック項目がありません</p>
          )}
          {Object.keys(groupedItems).map((category) => (
            <div key={category} className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-bold text-gray-700 mb-3">{category}</h4>
              <div className="space-y-2">
                {groupedItems[category].map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200"
                  >
                    <h5 className="font-bold text-gray-800">{item.name}</h5>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm font-bold transition-colors"
                    >
                      削除
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// カテゴリ管理
function CategoryManager({
  categories,
  onUpdate,
}: {
  categories: Category[];
  onUpdate: () => void;
}) {
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#6B7280");

  const handleCreate = async () => {
    if (!newName.trim()) {
      alert("名前を入力してください");
      return;
    }
    await createDynamicCategory(newName, newColor);
    setNewName("");
    setNewColor("#6B7280");
    onUpdate();
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">📂 カテゴリ管理</h2>

        {/* 新規作成フォーム */}
        <div className="bg-purple-50 rounded-lg p-4 mb-6">
          <h3 className="font-bold text-purple-800 mb-3">➕ 新しいカテゴリを追加</h3>
          <div className="grid grid-cols-3 gap-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="例: 断り文句"
              className="col-span-2 px-4 py-2 border-2 border-purple-300 rounded-lg"
            />
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="h-12 border-2 border-purple-300 rounded-lg"
            />
          </div>
          <button
            onClick={handleCreate}
            className="mt-3 w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold transition-colors"
          >
            追加する
          </button>
        </div>

        {/* 一覧 */}
        <div className="space-y-2">
          {categories.length === 0 && (
            <p className="text-center py-8 text-gray-500">まだカテゴリがありません</p>
          )}
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border-2 border-gray-200"
              style={{ borderLeftWidth: "6px", borderLeftColor: cat.color }}
            >
              <h4 className="font-bold text-gray-800">{cat.name}</h4>
              <div
                className="w-8 h-8 rounded-full"
                style={{ backgroundColor: cat.color }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// タイムライン管理（組み合わせトーク）
function TimelineManager({
  timelines,
  situations,
  talks,
  checkItems,
  onUpdate,
}: {
  timelines: Timeline[];
  situations: Situation[];
  talks: ScriptItem[];
  checkItems: CheckItem[];
  onUpdate: () => void;
}) {
  const [selectedSituation, setSelectedSituation] = useState<string>("");
  const [selectedTimeline, setSelectedTimeline] = useState<string>("");
  const [newTimelineTitle, setNewTimelineTitle] = useState("");
  const [timelineBlocks, setTimelineBlocks] = useState<ScriptItem[]>([]);
  const [timelineChecks, setTimelineChecks] = useState<CheckItem[]>([]);

  useEffect(() => {
    if (selectedTimeline) {
      loadTimelineData(selectedTimeline);
    }
  }, [selectedTimeline]);

  const loadTimelineData = async (timelineId: string) => {
    const [blocks, checks] = await Promise.all([
      getTimelineBlocks(timelineId),
      getTimelineCheckItems(timelineId),
    ]);
    setTimelineBlocks(blocks);
    setTimelineChecks(checks);
  };

  const handleCreateTimeline = async () => {
    if (!selectedSituation || !newTimelineTitle.trim()) {
      alert("状況タグとタイトルを入力してください");
      return;
    }

    const result = await createTimelineWithSituation(newTimelineTitle, selectedSituation, "");
    if (result.success && result.timelineId) {
      setNewTimelineTitle("");
      onUpdate();
      setSelectedTimeline(result.timelineId);
    }
  };

  const handleAddBlock = async (talkId: string) => {
    if (!selectedTimeline) return;
    await addItemToTimeline(selectedTimeline, talkId);
    await loadTimelineData(selectedTimeline);
  };

  const handleRemoveBlock = async (talkId: string) => {
    if (!selectedTimeline) return;
    await removeBlockFromTimeline(selectedTimeline, talkId);
    await loadTimelineData(selectedTimeline);
  };

  const handleAddCheck = async (checkId: string) => {
    if (!selectedTimeline) return;
    await addCheckItemToTimeline(selectedTimeline, checkId);
    await loadTimelineData(selectedTimeline);
  };

  const handleRemoveCheck = async (checkId: string) => {
    if (!selectedTimeline) return;
    await removeCheckItemFromTimeline(selectedTimeline, checkId);
    await loadTimelineData(selectedTimeline);
  };

  const handleDeleteTimeline = async () => {
    if (!selectedTimeline) return;
    if (!confirm("このタイムラインを削除しますか？")) return;
    await deleteTimeline(selectedTimeline);
    setSelectedTimeline("");
    setTimelineBlocks([]);
    setTimelineChecks([]);
    onUpdate();
  };

  const filteredTimelines = selectedSituation
    ? timelines.filter((tl) => tl.situation_id === selectedSituation)
    : timelines;

  const addedTalkIds = new Set(timelineBlocks.map((b) => b.id));
  const addedCheckIds = new Set(timelineChecks.map((c) => c.id));

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">🎯 組み合わせトーク管理</h2>
        <p className="text-sm text-gray-600 mb-6">
          💡 状況タグを選択し、そのフェーズで使うトークとチェック項目を組み合わせます
        </p>

        {/* Step 1: 状況タグ選択 */}
        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <h3 className="font-bold text-blue-800 mb-3">Step 1: 状況タグを選択</h3>
          <select
            value={selectedSituation}
            onChange={(e) => {
              setSelectedSituation(e.target.value);
              setSelectedTimeline("");
            }}
            className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg"
          >
            <option value="">選択してください...</option>
            {situations.map((sit) => (
              <option key={sit.id} value={sit.id}>
                {sit.icon} {sit.name}
              </option>
            ))}
          </select>
        </div>

        {selectedSituation && (
          <>
            {/* Step 2: タイムライン選択 or 新規作成 */}
            <div className="bg-green-50 rounded-lg p-4 mb-6">
              <h3 className="font-bold text-green-800 mb-3">
                Step 2: タイムラインを選択 or 新規作成
              </h3>

              {filteredTimelines.length > 0 && (
                <div className="mb-4">
                  <select
                    value={selectedTimeline}
                    onChange={(e) => setSelectedTimeline(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-green-300 rounded-lg"
                  >
                    <option value="">選択してください...</option>
                    {filteredTimelines.map((tl) => (
                      <option key={tl.id} value={tl.id}>
                        {tl.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="border-t-2 border-green-200 pt-4">
                <input
                  type="text"
                  value={newTimelineTitle}
                  onChange={(e) => setNewTimelineTitle(e.target.value)}
                  placeholder="新しいタイムラインのタイトル"
                  className="w-full px-4 py-2 border-2 border-green-300 rounded-lg mb-2"
                />
                <button
                  onClick={handleCreateTimeline}
                  className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition-colors"
                >
                  ➕ 新規タイムラインを作成
                </button>
              </div>
            </div>

            {/* Step 3: トークとチェック項目を組み合わせ */}
            {selectedTimeline && (
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-purple-800">
                    Step 3: トークとチェック項目を組み合わせ
                  </h3>
                  <button
                    onClick={handleDeleteTimeline}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-bold transition-colors"
                  >
                    🗑️ タイムライン削除
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {/* 左: トークブロック */}
                  <div>
                    <h4 className="font-bold text-gray-800 mb-3">💬 構成するトーク</h4>

                    {/* 追加済みトーク */}
                    <div className="space-y-2 mb-4">
                      {timelineBlocks.length === 0 && (
                        <p className="text-sm text-gray-500 text-center py-4">
                          まだトークが追加されていません
                        </p>
                      )}
                      {timelineBlocks.map((block, index) => (
                        <div
                          key={block.id}
                          className="flex items-center justify-between p-3 bg-white rounded-lg border-2 border-purple-400"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-purple-700">#{index + 1}</span>
                            <span className="font-bold text-gray-800">{block.title}</span>
                          </div>
                          <button
                            onClick={() => handleRemoveBlock(block.id)}
                            className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm transition-colors"
                          >
                            削除
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* トーク追加 */}
                    <div className="bg-white rounded-lg border-2 border-dashed border-purple-300 p-3">
                      <h5 className="text-sm font-bold text-gray-700 mb-2">➕ トークを追加</h5>
                      <div className="max-h-64 overflow-y-auto space-y-1">
                        {talks
                          .filter((t) => !addedTalkIds.has(t.id))
                          .map((talk) => (
                            <button
                              key={talk.id}
                              onClick={() => handleAddBlock(talk.id)}
                              className="w-full text-left px-3 py-2 bg-gray-50 hover:bg-purple-100 rounded border border-gray-200 hover:border-purple-400 transition-colors text-sm"
                            >
                              {talk.item_type === "main_scenario" ? "📖" : "🧩"} {talk.title}
                            </button>
                          ))}
                      </div>
                    </div>
                  </div>

                  {/* 右: チェック項目 */}
                  <div>
                    <h4 className="font-bold text-gray-800 mb-3">✅ チェック項目</h4>

                    {/* 追加済みチェック */}
                    <div className="space-y-2 mb-4">
                      {timelineChecks.length === 0 && (
                        <p className="text-sm text-gray-500 text-center py-4">
                          まだチェック項目が追加されていません
                        </p>
                      )}
                      {timelineChecks.map((check) => (
                        <div
                          key={check.id}
                          className="flex items-center justify-between p-3 bg-white rounded-lg border-2 border-purple-400"
                        >
                          <span className="font-bold text-gray-800">{check.name}</span>
                          <button
                            onClick={() => handleRemoveCheck(check.id)}
                            className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm transition-colors"
                          >
                            削除
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* チェック項目追加 */}
                    <div className="bg-white rounded-lg border-2 border-dashed border-purple-300 p-3">
                      <h5 className="text-sm font-bold text-gray-700 mb-2">
                        ➕ チェック項目を追加
                      </h5>
                      <div className="max-h-64 overflow-y-auto space-y-1">
                        {checkItems
                          .filter((c) => !addedCheckIds.has(c.id))
                          .map((check) => (
                            <button
                              key={check.id}
                              onClick={() => handleAddCheck(check.id)}
                              className="w-full text-left px-3 py-2 bg-gray-50 hover:bg-purple-100 rounded border border-gray-200 hover:border-purple-400 transition-colors text-sm"
                            >
                              {check.name}
                              {check.category && (
                                <span className="text-xs text-gray-500 ml-2">
                                  ({check.category})
                                </span>
                              )}
                            </button>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
