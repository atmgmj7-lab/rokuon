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
  deleteDynamicCategory,
  getAllTimelines,
  createTimelineWithSituation,
  deleteTimeline,
  getTimelineBlocks,
  addItemToTimeline,
  removeBlockFromTimeline,
  getTimelineCheckItems,
  addCheckItemToTimeline,
  removeCheckItemFromTimeline,
  setScriptItemVisibility,
  getScriptItemVisibilityForCurrentUser,
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
import LearningDataManager from "@/src/components/workspace/LearningDataManager";
import HearingManager from "@/src/components/workspace/HearingManager";
import UserManager from "@/src/components/workspace/UserManager";
import { getCurrentUser } from "@/src/actions/auth-actions";

type MenuTab =
  | "main_scenario"
  | "component"
  | "situations"
  | "categories"
  | "checks"
  | "timelines"
  | "hearing"
  | "learning_data"
  | "users";

export default function WorkspacePage() {
  const [activeMenu, setActiveMenu] = useState<MenuTab>("main_scenario");
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string; role: "admin" | "viewer" } | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  // データ
  const [allItems, setAllItems] = useState<ScriptItem[]>([]);
  const [allFolders, setAllFolders] = useState<ScriptFolder[]>([]);
  const [situations, setSituations] = useState<Situation[]>([]);
  const [checkItems, setCheckItems] = useState<CheckItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [timelines, setTimelines] = useState<Timeline[]>([]);
  const [visibilityMap, setVisibilityMap] = useState<Record<string, boolean>>({});

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
    const [items, folders, sits, chks, cats, tls, visMap] = await Promise.all([
      getAllItems(),
      getAllFolders(),
      getAllSituations(),
      getAllCheckItems(),
      getAllDynamicCategories(),
      getAllTimelines(),
      getScriptItemVisibilityForCurrentUser(),
    ]);

    setAllItems(items);
    setAllFolders(folders);
    setSituations(sits);
    setCheckItems(chks);
    setCategories(cats);
    setTimelines(tls);
    setVisibilityMap(visMap);

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
        debouncedTriggerCheckItemId || undefined,
        undefined
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

  // 新規アイテムを作成（タブに応じて base_talk / situational フォルダを選択）
  const handleCreateItem = async (itemType: "main_scenario" | "component") => {
    const folderType = itemType === "main_scenario" ? "base_talk" : "situational";
    const defaultFolder = allFolders.find((f) => f.folder_type === folderType);
    if (!defaultFolder) {
      alert(`${folderType === "base_talk" ? "基本シナリオ" : "部品トーク"}用のフォルダが見つかりません。先にフォルダを作成してください。`);
      return;
    }

    const result = await createItem(
      defaultFolder.id,
      "新しいトーク",
      "内容を入力してください",
      "",
      "",
      "",
      itemType,
      undefined,
      undefined,
      0,
      itemType === "component" ? 1 : 1
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

  // 新しい分岐トークを作成（部品トークなので situational フォルダを使用）
  const handleCreateBranchTalk = async (responseId: string) => {
    const defaultFolder = allFolders.find((f) => f.folder_type === "situational");
    if (!defaultFolder) {
      alert("部品トーク用のフォルダが見つかりません。先にフォルダを作成してください。");
      return;
    }

    const result = await createItem(
      defaultFolder.id,
      "分岐先トーク",
      "内容を入力してください",
      "",
      "",
      "",
      "component",
      undefined,
      undefined,
      0,
      1
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

  useEffect(() => {
    getCurrentUser().then(setCurrentUser);
  }, []);

  const displayItems =
    activeMenu === "main_scenario" || activeMenu === "component"
      ? allItems.filter((item) => item.item_type === activeMenu)
      : [];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[#827F7B]">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCFB]">
      {/* ページタイトル（共通ヘッダーの下・重複要素なし） */}
      <div className="bg-[#FDFCFB] px-4 sm:px-6 py-3 border-b border-stone-200/60">
        <div className="flex items-start justify-between gap-4">
          <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#2D2B2A]">ワークスペース（統合版）</h1>
          <p className="text-xs sm:text-sm text-[#827F7B] mt-0.5">
            すべての設定を一箇所で管理 | 自動保存対応
          </p>
          {selectedItem && (
            <div className="flex items-center gap-2 mt-2">
              <div className="inline-flex items-center gap-2 bg-white border border-stone-200 px-3 py-1.5 rounded-lg shrink-0">
                {saveStatus === "saving" && (
                  <>
                    <div className="animate-spin h-3.5 w-3.5 border-2 border-stone-400 border-t-transparent rounded-full" />
                    <span className="text-xs sm:text-sm font-medium text-[#2D2B2A]">保存中...</span>
                  </>
                )}
                {saveStatus === "saved" && (
                  <>
                    <span className="text-[#827F7B] text-base">✓</span>
                    <span className="text-xs sm:text-sm font-medium text-[#2D2B2A]">保存完了</span>
                  </>
                )}
                {saveStatus === "idle" && (
                  <span className="text-xs sm:text-sm font-medium text-[#827F7B]">編集可能</span>
                )}
              </div>
            </div>
          )}
          </div>
          <Link
            href="/"
            className="shrink-0 px-4 py-2 bg-white border border-stone-200 text-stone-600 rounded-lg text-sm font-medium hover:bg-stone-50 hover:text-stone-900 transition-colors"
          >
            ← ホーム
          </Link>
        </div>
      </div>

      {/* メニュータブ */}
      <div className="bg-white border-b border-stone-200/60 overflow-x-auto">
        <div className="flex min-w-max">
          <MenuButton
            active={activeMenu === "main_scenario"}
            onClick={() => setActiveMenu("main_scenario")}
            label="基本シナリオ"
          />
          <MenuButton
            active={activeMenu === "component"}
            onClick={() => setActiveMenu("component")}
            label="部品トーク"
          />
          <MenuButton
            active={activeMenu === "hearing"}
            onClick={() => setActiveMenu("hearing")}
            label="アポヒアリング"
          />
          <MenuButton
            active={activeMenu === "timelines"}
            onClick={() => setActiveMenu("timelines")}
            label="組み合わせトーク"
          />
          <MenuButton
            active={activeMenu === "situations"}
            onClick={() => setActiveMenu("situations")}
            label="状況タグ"
          />
          <MenuButton
            active={activeMenu === "checks"}
            onClick={() => setActiveMenu("checks")}
            label="チェック項目"
          />
          <MenuButton
            active={activeMenu === "categories"}
            onClick={() => setActiveMenu("categories")}
            label="カテゴリ"
          />
          <MenuButton
            active={activeMenu === "learning_data"}
            onClick={() => setActiveMenu("learning_data")}
            label="学習データ（修正履歴）"
          />
          {(currentUser?.role ?? "viewer") === "admin" && (
            <MenuButton
              active={activeMenu === "users"}
              onClick={() => setActiveMenu("users")}
              label="ユーザー管理"
            />
          )}
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
            currentUserRole={currentUser?.role ?? "viewer"}
            situations={situations}
            checkItems={checkItems}
            categories={categories}
            responses={responses}
            allItems={allItems}
            saveStatus={saveStatus}
            visibilityMap={visibilityMap}
            onVisibilityChange={async (itemId, isVisible) => {
              const r = await setScriptItemVisibility(itemId, isVisible);
              if (r.success) {
                setVisibilityMap((prev) => ({ ...prev, [itemId]: isVisible }));
              } else {
                alert(r.error || "設定の保存に失敗しました");
              }
            }}
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

        {/* アポヒアリング管理 */}
        {activeMenu === "hearing" && <HearingManager onUpdate={() => loadData(true)} />}

        {/* カテゴリ管理 */}
        {activeMenu === "categories" && (
          <CategoryManager categories={categories} onUpdate={() => loadData(true)} />
        )}

        {/* 学習データ（修正履歴） */}
        {activeMenu === "learning_data" && <LearningDataManager />}

        {/* ユーザー管理（admin のみ） */}
        {activeMenu === "users" && (currentUser?.role ?? "viewer") === "admin" && <UserManager />}
      </div>
    </div>
  );
}

// メニューボタン
function MenuButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-4 font-bold transition-all whitespace-nowrap ${
        active
          ? "bg-white text-[#2D2B2A] border-b-2 border-stone-400"
          : "bg-white text-[#827F7B] hover:bg-stone-50 hover:text-stone-900"
      }`}
    >
      {label}
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
  currentUserRole,
  situations,
  checkItems,
  categories,
  responses,
  allItems,
  saveStatus,
  visibilityMap,
  onVisibilityChange,
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
  const canEdit = currentUserRole === "admin";

  return (
    <div className="flex gap-6">
      {/* 左: リスト */}
      <div className="w-96 bg-white rounded-2xl border border-stone-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[#2D2B2A]">
            {activeMenu === "main_scenario" ? "基本シナリオ" : "部品トーク"}
          </h2>
          {canEdit && (
            <button
              onClick={() => onCreateItem(activeMenu)}
              className="px-3 py-1.5 bg-white border border-stone-200 text-stone-600 rounded-lg font-medium hover:bg-stone-50 hover:text-stone-900 transition-colors text-sm"
            >
              追加
            </button>
          )}
        </div>

        {displayItems.length === 0 && (
          <div className="text-center py-12 text-[#827F7B]">
            <p className="text-sm">まだトークがありません</p>
          </div>
        )}

        <div className="space-y-2">
          {displayItems.map((item: ScriptItem) => (
            <div
              key={item.id}
              className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                selectedItem?.id === item.id
                  ? "bg-stone-100 border-2 border-stone-400"
                  : "bg-white border border-stone-200/80 hover:border-stone-300"
              }`}
            >
              <div className="flex-1" onClick={() => onSelectItem(item.id)}>
                <h4 className="font-bold text-[#2D2B2A] text-sm">{item.title}</h4>
                {item.hearing_purpose && (
                  <p className="text-xs text-[#827F7B] mt-1">{item.hearing_purpose}</p>
                )}
              </div>
              {canEdit && (
                <button
                  onClick={() => onDeleteItem(item.id)}
                  className="ml-2 px-3 py-1.5 bg-white border border-stone-200 text-stone-600 rounded-lg text-xs font-medium hover:bg-stone-50 hover:text-stone-900 transition-colors"
                >
                  削除
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 右: エディター */}
      <div className="flex-1 bg-white rounded-2xl border border-stone-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] p-6">
        {!selectedItem ? (
          <div className="h-full flex items-center justify-center text-[#827F7B]">
            <div className="text-center">
              <p className="text-lg">左からトークを選択してください</p>
              <p className="text-sm mt-2 opacity-70">編集内容は自動的に保存されます</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 保存状態インジケーター */}
            <div className="flex items-center justify-end">
              {saveStatus === "saving" && (
                <div className="flex items-center gap-2 px-4 py-2 bg-stone-50 rounded-lg border border-stone-200/80">
                  <div className="animate-spin h-4 w-4 border-2 border-stone-500 border-t-transparent rounded-full" />
                  <span className="text-sm font-medium text-[#2D2B2A]">保存中...</span>
                </div>
              )}
              {saveStatus === "saved" && (
                <div className="flex items-center gap-2 px-4 py-2 bg-stone-50 rounded-lg border border-stone-200/80">
                  <span className="text-[#827F7B] text-xl">✓</span>
                  <span className="text-sm font-medium text-[#2D2B2A]">保存完了</span>
                </div>
              )}
            </div>

            {/* トーク編集フォーム */}
            <div>
              <h3 className="text-xl font-bold text-[#2D2B2A] mb-4">トーク内容</h3>

              <div className="space-y-4">
                {/* タイトル */}
                <div>
                  <label className="block text-sm font-bold text-[#2D2B2A] mb-2">
                    タイトル（必須）
                  </label>
                  <input
                    type="text"
                    value={editingTitle}
                    onChange={(e) => canEdit && onChangeTitle(e.target.value)}
                    readOnly={!canEdit}
                    className={`w-full px-4 py-3 border border-stone-200 rounded-lg focus:ring-2 focus:ring-stone-300 focus:border-stone-300 transition-all ${!canEdit ? "bg-stone-50 cursor-default" : ""}`}
                    placeholder="トークのタイトルを入力..."
                  />
                </div>

                {/* 3層構造 */}
                <div className="border-l-4 border-stone-300 pl-4 bg-stone-50/50 p-4 rounded-r-lg">
                  <label className="block text-sm font-bold text-[#2D2B2A] mb-2">
                    ヒアリングすべき内容
                  </label>
                  <textarea
                    value={editingHearingPurpose}
                    onChange={(e) => canEdit && onChangeHearingPurpose(e.target.value)}
                    readOnly={!canEdit}
                    rows={3}
                    className={`w-full px-4 py-3 border border-stone-200 rounded-lg focus:ring-2 focus:ring-stone-300 focus:border-stone-300 transition-all ${!canEdit ? "bg-stone-50 cursor-default" : ""}`}
                    placeholder="このトークの目的を入力..."
                  />
                </div>

                <div className="border-l-4 border-stone-300 pl-4 bg-stone-50/50 p-4 rounded-r-lg">
                  <label className="block text-sm font-bold text-[#2D2B2A] mb-2">
                    実際の聞き方
                  </label>
                  <textarea
                    value={editingContent}
                    onChange={(e) => canEdit && onChangeContent(e.target.value)}
                    readOnly={!canEdit}
                    rows={8}
                    className={`w-full px-4 py-3 border border-stone-200 rounded-lg focus:ring-2 focus:ring-stone-300 focus:border-stone-300 text-lg transition-all ${!canEdit ? "bg-stone-50 cursor-default" : ""}`}
                    placeholder="実際に話すトーク内容を入力..."
                  />
                </div>

                <div className="border-l-4 border-stone-300 pl-4 bg-stone-50/50 p-4 rounded-r-lg">
                  <label className="block text-sm font-bold text-[#2D2B2A] mb-2">
                    トップの狙い
                  </label>
                  <textarea
                    value={editingStrategyNote}
                    onChange={(e) => canEdit && onChangeStrategyNote(e.target.value)}
                    readOnly={!canEdit}
                    rows={4}
                    className={`w-full px-4 py-3 border border-stone-200 rounded-lg focus:ring-2 focus:ring-stone-300 focus:border-stone-300 transition-all ${!canEdit ? "bg-stone-50 cursor-default" : ""}`}
                    placeholder="このトークの戦略的意図を入力..."
                  />
                </div>
              </div>
            </div>

            {/* 部品トーク設定 */}
            {selectedItem.item_type === "component" && (
              <div>
                <h3 className="text-xl font-bold text-[#2D2B2A] mb-4">部品トーク設定</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-[#2D2B2A] mb-2">
                      状況タグに紐付け
                    </label>
                    <select
                      value={editingTargetSituationId}
                      onChange={(e) => canEdit && onChangeTargetSituationId(e.target.value)}
                      disabled={!canEdit}
                      className="w-full px-4 py-3 border border-stone-200 rounded-lg focus:ring-2 focus:ring-stone-300 focus:border-stone-300 transition-all disabled:bg-stone-100 disabled:cursor-not-allowed"
                    >
                      <option value="">紐付けなし</option>
                      {situations.map((sit: Situation) => (
                        <option key={sit.id} value={sit.id}>
                          {sit.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-[#2D2B2A] mb-2">
                      チェック項目に紐付け
                    </label>
                    <select
                      value={editingTriggerCheckItemId}
                      onChange={(e) => canEdit && onChangeTriggerCheckItemId(e.target.value)}
                      disabled={!canEdit}
                      className="w-full px-4 py-3 border border-stone-200 rounded-lg focus:ring-2 focus:ring-stone-300 focus:border-stone-300 transition-all disabled:bg-stone-100 disabled:cursor-not-allowed"
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
              <h3 className="text-xl font-bold text-[#2D2B2A] mb-4">その他の設定</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-[#2D2B2A] mb-2">
                    カテゴリ
                  </label>
                  <select
                    value={editingCategoryId}
                    onChange={(e) => canEdit && onChangeCategoryId(e.target.value)}
                    disabled={!canEdit}
                    className="w-full px-4 py-3 border border-stone-200 rounded-lg focus:ring-2 focus:ring-stone-300 focus:border-stone-300 transition-all disabled:bg-stone-100 disabled:cursor-not-allowed"
                  >
                    <option value="">未分類</option>
                    {categories.map((cat: Category) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between p-4 bg-stone-50 rounded-lg border border-stone-200/80">
                  <div>
                    <label className="block text-sm font-bold text-[#2D2B2A]">
                      スカウターに表示する
                    </label>
                    <p className="text-xs text-[#827F7B] mt-1">
                      拡張機能のスカウターでこのトークを表示
                    </p>
                  </div>
                  <button
                    onClick={() => onVisibilityChange?.(selectedItem.id, !(visibilityMap[selectedItem.id] !== false))}
                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                      (visibilityMap[selectedItem.id] !== false) ? "bg-stone-600" : "bg-stone-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                        (visibilityMap[selectedItem.id] !== false) ? "translate-x-7" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-stone-50 rounded-lg border border-stone-200/80">
                  <div>
                    <label className="block text-sm font-bold text-[#2D2B2A]">
                      Quick Response（武器庫）に表示
                    </label>
                    <p className="text-xs text-[#827F7B] mt-1">
                      コール画面の右下に常時表示
                    </p>
                  </div>
                  {canEdit && (
                  <button
                    onClick={() => onChangeIsQuickResponse(editingIsQuickResponse === 1 ? 0 : 1)}
                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                      editingIsQuickResponse === 1 ? "bg-stone-600" : "bg-stone-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                        editingIsQuickResponse === 1 ? "translate-x-7" : "translate-x-1"
                      }`}
                    />
                  </button>
                  )}
                  {!canEdit && (
                    <span className="text-sm text-[#827F7B]">
                      {editingIsQuickResponse === 1 ? "ON" : "OFF"}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 分岐管理 */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-[#2D2B2A]">返答パターンと分岐</h3>
                {canEdit && (
                  <button
                    onClick={onAddResponse}
                    className="px-3 py-1.5 bg-white border border-stone-200 text-stone-600 rounded-lg font-medium text-sm hover:bg-stone-50 hover:text-stone-900 transition-colors"
                  >
                    返答を追加
                  </button>
                )}
              </div>

              {responses.length === 0 && (
                <div className="text-center py-8 text-[#827F7B]">
                  <p className="text-sm">まだ返答パターンがありません</p>
                </div>
              )}

              <div className="space-y-4">
                {responses.map((response: ItemResponse) => {
                  const nextItem = allItems.find((item: ScriptItem) => item.id === response.next_item_id);
                  return (
                    <div
                      key={response.id}
                      className="p-4 bg-stone-50 rounded-lg border border-stone-200/80"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <input
                          type="text"
                          value={response.response_text}
                          onChange={(e) =>
                            canEdit && onUpdateResponse(response.id, e.target.value, response.next_item_id)
                          }
                          readOnly={!canEdit}
                          placeholder="顧客の返答（例: 忙しいです）"
                          className={`flex-1 px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-stone-300 focus:border-stone-300 mr-3 transition-all ${!canEdit ? "bg-stone-50 cursor-default" : ""}`}
                        />
                        {canEdit && (
                          <button
                            onClick={() => onDeleteResponse(response.id)}
                            className="px-3 py-1.5 bg-white border border-stone-200 text-stone-600 rounded-lg text-sm font-medium hover:bg-stone-50 hover:text-stone-900 transition-colors"
                          >
                            削除
                          </button>
                        )}
                      </div>

                      <div className="pl-4 border-l-4 border-stone-300">
                        <p className="text-sm font-medium text-[#2D2B2A] mb-2">
                          ↓ 分岐先のトーク:
                        </p>
                        {nextItem ? (
                          <div className="p-3 bg-stone-50 rounded-lg border border-stone-200/80">
                            <p className="font-bold text-[#2D2B2A]">{nextItem.title}</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {canEdit && (
                              <>
                            <button
                              onClick={() => onCreateBranchTalk(response.id)}
                              className="w-full px-4 py-2 bg-white border border-stone-200 text-stone-600 rounded-lg font-medium text-sm hover:bg-stone-50 hover:text-stone-900 transition-colors"
                            >
                              新しいトークを作成
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
                              className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-stone-300 focus:border-stone-300 text-sm transition-all"
                            >
                              <option value="">既存から選択...</option>
                              {allItems.map((item: ScriptItem) => (
                                <option key={item.id} value={item.id}>
                                  {item.title}
                                </option>
                              ))}
                            </select>
                            </>
                            )}
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
  const [newIcon, setNewIcon] = useState("");
  const [newColor, setNewColor] = useState("#3B82F6");

  const handleCreate = async () => {
    if (!newName.trim()) {
      alert("名前を入力してください");
      return;
    }
    await createSituation(newName, "", newIcon || "•", newColor);
    setNewName("");
    setNewIcon("");
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
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] p-6">
        <h2 className="text-2xl font-bold text-[#2D2B2A] mb-6">状況タグ管理</h2>

        {/* 新規作成フォーム */}
        <div className="bg-stone-50 rounded-lg p-4 mb-6 border border-stone-200/80">
          <h3 className="font-bold text-[#2D2B2A] mb-3">新しい状況タグを追加</h3>
          <div className="grid grid-cols-4 gap-3">
            <input
              type="text"
              value={newIcon}
              onChange={(e) => setNewIcon(e.target.value)}
              placeholder="アイコン（任意）"
              maxLength={2}
              className="px-4 py-2 border border-stone-200 rounded-lg text-center"
            />
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="h-12 border border-stone-200 rounded-lg"
            />
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="例: ヒアリング時"
              className="col-span-2 px-4 py-2 border border-stone-200 rounded-lg"
            />
          </div>
          <button
            onClick={handleCreate}
            className="mt-3 w-full px-6 py-3 bg-white border border-stone-200 text-stone-600 rounded-lg font-medium hover:bg-stone-50 hover:text-stone-900 transition-colors"
          >
            追加する
          </button>
        </div>

        {/* 一覧 */}
        <div className="space-y-2">
          {situations.length === 0 && (
            <p className="text-center py-8 text-[#827F7B]">まだ状況タグがありません</p>
          )}
          {situations.map((sit) => (
            <div
              key={sit.id}
              className="flex items-center justify-between p-4 bg-stone-50 rounded-lg border border-stone-200/80"
              style={{ borderLeftWidth: "6px", borderLeftColor: sit.color }}
            >
              <div className="flex items-center gap-4">
                <div>
<h4 className="font-bold text-[#2D2B2A]">{sit.name}</h4>
              {sit.description && <p className="text-sm text-[#827F7B]">{sit.description}</p>}
                </div>
              </div>
              <button
                onClick={() => handleDelete(sit.id)}
                className="px-3 py-1.5 bg-white border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 hover:text-red-700 transition-colors"
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
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] p-6">
        <h2 className="text-2xl font-bold text-[#2D2B2A] mb-6">チェック項目管理</h2>

        {/* 新規作成フォーム */}
        <div className="bg-stone-50 rounded-lg p-4 mb-6 border border-stone-200/80">
          <h3 className="font-bold text-[#2D2B2A] mb-3">新しいチェック項目を追加</h3>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="例: 予算の確認"
              className="px-4 py-2 border border-stone-200 rounded-lg"
            />
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="カテゴリ（例: BANT）"
              className="px-4 py-2 border border-stone-200 rounded-lg"
            />
          </div>
          <button
            onClick={handleCreate}
            className="mt-3 w-full px-6 py-3 bg-white border border-stone-200 text-stone-600 rounded-lg font-medium hover:bg-stone-50 hover:text-stone-900 transition-colors"
          >
            追加する
          </button>
        </div>

        {/* 一覧（カテゴリ別） */}
        <div className="space-y-4">
          {Object.keys(groupedItems).length === 0 && (
            <p className="text-center py-8 text-[#827F7B]">まだチェック項目がありません</p>
          )}
          {Object.keys(groupedItems).map((category) => (
            <div key={category} className="bg-stone-50 rounded-lg p-4 border border-stone-200/80">
              <h4 className="font-bold text-[#2D2B2A] mb-3">{category}</h4>
              <div className="space-y-2">
                {groupedItems[category].map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-white rounded-lg border border-stone-200/80"
                  >
                    <h5 className="font-bold text-[#2D2B2A]">{item.name}</h5>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="px-3 py-1.5 bg-white border border-stone-200 text-stone-600 rounded-lg text-sm font-medium hover:bg-stone-50 hover:text-stone-900 transition-colors"
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

  const handleDelete = async (categoryId: string) => {
    if (!window.confirm("このカテゴリと中に含まれるトークをすべて削除してもよろしいですか？")) return;
    const result = await deleteDynamicCategory(categoryId);
    if (result.success) {
      onUpdate();
    } else {
      alert(result.error ?? "削除に失敗しました");
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] p-6">
        <h2 className="text-2xl font-bold text-[#2D2B2A] mb-6">カテゴリ管理</h2>

        {/* 新規作成フォーム */}
        <div className="bg-stone-50 rounded-lg p-4 mb-6 border border-stone-200/80">
          <h3 className="font-bold text-[#2D2B2A] mb-3">新しいカテゴリを追加</h3>
          <div className="grid grid-cols-3 gap-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="例: 断り文句"
              className="col-span-2 px-4 py-2 border border-stone-200 rounded-lg"
            />
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="h-12 border border-stone-200 rounded-lg"
            />
          </div>
          <button
            onClick={handleCreate}
            className="mt-3 w-full px-6 py-3 bg-white border border-stone-200 text-stone-600 rounded-lg font-medium hover:bg-stone-50 hover:text-stone-900 transition-colors"
          >
            追加する
          </button>
        </div>

        {/* 一覧 */}
        <div className="space-y-2">
          {categories.length === 0 && (
            <p className="text-center py-8 text-[#827F7B]">まだカテゴリがありません</p>
          )}
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center justify-between p-4 bg-stone-50 rounded-lg border border-stone-200/80"
              style={{ borderLeftWidth: "6px", borderLeftColor: cat.color }}
            >
              <h4 className="font-bold text-[#2D2B2A]">{cat.name}</h4>
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-full"
                  style={{ backgroundColor: cat.color }}
                />
                <button
                  type="button"
                  onClick={() => handleDelete(cat.id)}
                  className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="削除"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  </svg>
                </button>
              </div>
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
  const [selectedSituations, setSelectedSituations] = useState<Set<string>>(new Set());
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
    if (selectedSituations.size === 0 || !newTimelineTitle.trim()) {
      alert("状況タグとタイトルを入力してください");
      return;
    }

    // 最初の状況タグでタイムラインを作成
    const firstSituation = Array.from(selectedSituations)[0];
    const result = await createTimelineWithSituation(newTimelineTitle, firstSituation, "");
    if (result.success && result.timelineId) {
      setNewTimelineTitle("");
      onUpdate();
      setSelectedTimeline(result.timelineId);
    }
  };

  const handleToggleSituation = (situationId: string) => {
    const newSelected = new Set(selectedSituations);
    if (newSelected.has(situationId)) {
      newSelected.delete(situationId);
    } else {
      newSelected.add(situationId);
    }
    setSelectedSituations(newSelected);
    setSelectedTimeline("");
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

  const filteredTimelines = selectedSituations.size > 0
    ? timelines.filter((tl) => selectedSituations.has(tl.situation_id || ""))
    : timelines;

  const addedTalkIds = new Set(timelineBlocks.map((b) => b.id));
  const addedCheckIds = new Set(timelineChecks.map((c) => c.id));

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] p-6">
        <h2 className="text-2xl font-bold text-[#2D2B2A] mb-6">組み合わせトーク管理</h2>
        <p className="text-sm text-[#827F7B] mb-6">
          状況タグを選択し、そのフェーズで使うトークとチェック項目を組み合わせます
        </p>

        {/* Step 1: 状況タグ選択（複数選択可） */}
        <div className="bg-stone-50 rounded-lg p-4 mb-6">
          <h3 className="font-bold text-[#2D2B2A] mb-3">Step 1: 状況タグを選択（複数選択可）</h3>
          <p className="text-sm text-stone-700 mb-3">
            複数の状況タグを選択できます。選択したタグに紐づくタイムラインが表示されます。
          </p>
          {situations.length === 0 && (
            <p className="text-center py-4 text-[#827F7B] text-sm">
              まだ状況タグがありません。「状況タグ管理」で追加してください。
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            {situations.map((sit) => {
              const isSelected = selectedSituations.has(sit.id);
              return (
                <button
                  key={sit.id}
                  onClick={() => handleToggleSituation(sit.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all ${
                    isSelected
                      ? "bg-stone-100 border-stone-400 ring-2 ring-stone-300"
                      : "bg-white border border-stone-200/80 hover:border-stone-300"
                  }`}
                  style={{
                    borderLeftWidth: "6px",
                    borderLeftColor: sit.color,
                  }}
                >
                  <span className={`text-sm ${isSelected ? "text-[#2D2B2A]" : "text-[#827F7B]"}`}>
                    {isSelected ? "●" : "○"}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${isSelected ? "text-[#2D2B2A]" : "text-[#827F7B]"}`}>
                      {sit.name}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
          {selectedSituations.size > 0 && (
            <div className="mt-3 p-3 bg-stone-100 rounded-lg border border-stone-200/60">
              <p className="text-sm font-bold text-[#2D2B2A]">
                選択中: {selectedSituations.size}個の状況タグ
              </p>
            </div>
          )}
        </div>

        {selectedSituations.size > 0 && (
          <>
            {/* Step 2: タイムライン選択 or 新規作成 */}
            <div className="bg-stone-50 rounded-lg p-4 mb-6 border border-stone-200/80">
              <h3 className="font-bold text-[#2D2B2A] mb-3">
                Step 2: タイムラインを選択 or 新規作成
              </h3>

              {filteredTimelines.length > 0 && (
                <div className="mb-4">
                  <select
                    value={selectedTimeline}
                    onChange={(e) => setSelectedTimeline(e.target.value)}
                    className="w-full px-4 py-3 border border-stone-200 rounded-lg"
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

              <div className="border-t border-stone-200/60 pt-4">
                <input
                  type="text"
                  value={newTimelineTitle}
                  onChange={(e) => setNewTimelineTitle(e.target.value)}
                  placeholder="新しいタイムラインのタイトル"
                  className="w-full px-4 py-2 border border-stone-200 rounded-lg mb-2"
                />
                <button
                  onClick={handleCreateTimeline}
                  className="w-full px-6 py-3 bg-white border border-stone-200 text-stone-600 rounded-lg font-medium hover:bg-stone-50 hover:text-stone-900 transition-colors"
                >
                  新規タイムラインを作成
                </button>
              </div>
            </div>

            {/* Step 3: トークとチェック項目を組み合わせ */}
            {selectedTimeline && (
              <div className="bg-stone-50 rounded-lg p-4 border border-stone-200/80 mb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-[#2D2B2A]">
                    Step 3: トークとチェック項目を組み合わせ
                  </h3>
                  <button
                    onClick={handleDeleteTimeline}
                    className="px-3 py-1.5 bg-white border border-stone-200 text-stone-600 rounded-lg text-sm font-medium hover:bg-stone-50 hover:text-stone-900 transition-colors"
                  >
                    タイムライン削除
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {/* 左: トークブロック */}
                  <div>
                    <h4 className="font-bold text-[#2D2B2A] mb-3">構成するトーク</h4>

                    {/* 追加済みトーク */}
                    <div className="space-y-2 mb-4">
                      {timelineBlocks.length === 0 && (
                        <p className="text-sm text-[#827F7B] text-center py-4">
                          まだトークが追加されていません
                        </p>
                      )}
                      {timelineBlocks.map((block, index) => (
                        <div
                          key={block.id}
                          className="flex items-center justify-between p-3 bg-white rounded-lg border border-stone-200/80"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#827F7B]">#{index + 1}</span>
                            <span className="font-bold text-[#2D2B2A]">{block.title}</span>
                          </div>
                          <button
                            onClick={() => handleRemoveBlock(block.id)}
                            className="px-3 py-1.5 bg-white border border-stone-200 text-stone-600 rounded-lg text-sm font-medium hover:bg-stone-50 hover:text-stone-900 transition-colors"
                          >
                            削除
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* トーク追加 */}
                    <div className="bg-white rounded-lg border border-dashed border-stone-200 p-3">
                      <h5 className="text-sm font-bold text-[#2D2B2A] mb-2">トークを追加</h5>
                      <div className="max-h-64 overflow-y-auto space-y-1">
                        {talks
                          .filter((t) => !addedTalkIds.has(t.id))
                          .map((talk) => (
                            <button
                              key={talk.id}
                              onClick={() => handleAddBlock(talk.id)}
                              className="w-full text-left px-3 py-2 bg-stone-50 hover:bg-stone-100 rounded border border-stone-200 hover:border-stone-400 transition-colors text-sm"
                            >
                              {talk.title}
                            </button>
                          ))}
                      </div>
                    </div>
                  </div>

                  {/* 右: チェック項目 */}
                  <div>
                    <h4 className="font-bold text-[#2D2B2A] mb-3">チェック項目</h4>

                    {/* 追加済みチェック */}
                    <div className="space-y-2 mb-4">
                      {timelineChecks.length === 0 && (
                        <p className="text-sm text-[#827F7B] text-center py-4">
                          まだチェック項目が追加されていません
                        </p>
                      )}
                      {timelineChecks.map((check) => (
                        <div
                          key={check.id}
                          className="flex items-center justify-between p-3 bg-white rounded-lg border border-stone-200/80"
                        >
                          <span className="font-bold text-[#2D2B2A]">{check.name}</span>
                          <button
                            onClick={() => handleRemoveCheck(check.id)}
                            className="px-3 py-1.5 bg-white border border-stone-200 text-stone-600 rounded-lg text-sm font-medium hover:bg-stone-50 hover:text-stone-900 transition-colors"
                          >
                            削除
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* チェック項目追加 */}
                    <div className="bg-white rounded-lg border border-dashed border-stone-200 p-3">
                      <h5 className="text-sm font-bold text-[#2D2B2A] mb-2">
                        チェック項目を追加
                      </h5>
                      <div className="max-h-64 overflow-y-auto space-y-1">
                        {checkItems
                          .filter((c) => !addedCheckIds.has(c.id))
                          .map((check) => (
                            <button
                              key={check.id}
                              onClick={() => handleAddCheck(check.id)}
                              className="w-full text-left px-3 py-2 bg-stone-50 hover:bg-stone-100 rounded border border-stone-200 hover:border-stone-400 transition-colors text-sm"
                            >
                              {check.name}
                              {check.category && (
                                <span className="text-xs text-[#827F7B] ml-2">
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
