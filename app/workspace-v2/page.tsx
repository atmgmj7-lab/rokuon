"use client";

import { useState, useEffect } from "react";
import {
  getAllSituations,
  createSituation,
  updateSituation,
  deleteSituation,
  getAllDynamicCategories,
  createDynamicCategory,
  getAllItems,
  getItemById,
  updateItem,
  createItem,
  getAllCheckItems,
  createCheckItem,
  updateCheckItem,
  deleteCheckItem,
  getAllTimelines,
  getTimelinesBySituation,
  createTimelineWithSituation,
  deleteTimeline,
  getTimelineBlocks,
  addItemToTimeline,
  removeBlockFromTimeline,
  getTimelineCheckItems,
  addCheckItemToTimeline,
  removeCheckItemFromTimeline,
  getResponsesByItem,
  createItemResponse,
  updateItemResponse,
  deleteItemResponse,
  getAllFolders,
} from "@/src/actions/workspace-actions";
import type {
  Situation,
  Category,
  ScriptItem,
  CheckItem,
  Timeline,
  ItemResponse,
  ScriptFolder,
} from "@/src/types/workspace";
import { useDebounce } from "@/src/hooks/useDebounce";
import Link from "next/link";

type MenuTab = "situations" | "categories" | "talks" | "checks" | "timelines";

export default function WorkspaceV2Page() {
  const [activeMenu, setActiveMenu] = useState<MenuTab>("situations");
  const [loading, setLoading] = useState(true);

  // データ
  const [situations, setSituations] = useState<Situation[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [talks, setTalks] = useState<ScriptItem[]>([]);
  const [checkItems, setCheckItems] = useState<CheckItem[]>([]);
  const [timelines, setTimelines] = useState<Timeline[]>([]);
  const [folders, setFolders] = useState<ScriptFolder[]>([]);

  // データを読み込む
  const loadData = async () => {
    setLoading(true);

    const [sits, cats, tlks, chks, tls, flds] = await Promise.all([
      getAllSituations(),
      getAllDynamicCategories(),
      getAllItems(),
      getAllCheckItems(),
      getAllTimelines(),
      getAllFolders(),
    ]);

    setSituations(sits);
    setCategories(cats);
    setTalks(tlks);
    setCheckItems(chks);
    setTimelines(tls);
    setFolders(flds);

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

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
            <h1 className="text-2xl font-bold">🛠️ ワークスペース V2（完全カスタマイズ）</h1>
            <p className="text-sm opacity-90 mt-1">
              💡 営業戦略に合わせて、ツールを完全にカスタマイズできます
            </p>
          </div>
          <div className="flex gap-2">
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
      <div className="bg-white border-b-2 border-gray-200 shadow-md">
        <div className="max-w-7xl mx-auto flex">
          <MenuButton
            active={activeMenu === "situations"}
            onClick={() => setActiveMenu("situations")}
            icon="🎬"
            label="状況タグ管理"
            description="受付突破時、ヒアリング時など"
          />
          <MenuButton
            active={activeMenu === "categories"}
            onClick={() => setActiveMenu("categories")}
            icon="📂"
            label="カテゴリ管理"
            description="断り文句、チャンストークなど"
          />
          <MenuButton
            active={activeMenu === "talks"}
            onClick={() => setActiveMenu("talks")}
            icon="💬"
            label="単体トーク（部品）"
            description="トークの作成・編集"
          />
          <MenuButton
            active={activeMenu === "checks"}
            onClick={() => setActiveMenu("checks")}
            icon="✅"
            label="チェック項目"
            description="確認すべき項目の管理"
          />
          <MenuButton
            active={activeMenu === "timelines"}
            onClick={() => setActiveMenu("timelines")}
            icon="🎯"
            label="タイムライン組み立て"
            description="部品を組み合わせる"
          />
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="max-w-7xl mx-auto p-6">
        {activeMenu === "situations" && (
          <SituationManager situations={situations} onUpdate={loadData} />
        )}
        {activeMenu === "categories" && (
          <CategoryManager categories={categories} onUpdate={loadData} />
        )}
        {activeMenu === "talks" && (
          <TalkManager
            talks={talks}
            categories={categories}
            folders={folders}
            onUpdate={loadData}
          />
        )}
        {activeMenu === "checks" && (
          <CheckItemManager checkItems={checkItems} onUpdate={loadData} />
        )}
        {activeMenu === "timelines" && (
          <TimelineManager
            timelines={timelines}
            situations={situations}
            talks={talks}
            checkItems={checkItems}
            onUpdate={loadData}
          />
        )}
      </div>
    </div>
  );
}

// メニューボタンコンポーネント
function MenuButton({
  active,
  onClick,
  icon,
  label,
  description,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
  description: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 px-6 py-4 transition-all ${
        active
          ? "bg-indigo-50 border-b-4 border-indigo-600"
          : "bg-white hover:bg-gray-50"
      }`}
    >
      <div className="text-center">
        <div className="text-2xl mb-1">{icon}</div>
        <div className={`font-bold text-sm ${active ? "text-indigo-700" : "text-gray-700"}`}>
          {label}
        </div>
        <div className="text-xs text-gray-500 mt-1">{description}</div>
      </div>
    </button>
  );
}

// 状況タグ管理コンポーネント
function SituationManager({
  situations,
  onUpdate,
}: {
  situations: Situation[];
  onUpdate: () => void;
}) {
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newIcon, setNewIcon] = useState("📌");
  const [newColor, setNewColor] = useState("#3B82F6");

  const handleCreate = async () => {
    if (!newName.trim()) {
      alert("名前を入力してください");
      return;
    }

    const result = await createSituation(newName, newDescription, newIcon, newColor);
    if (result.success) {
      setNewName("");
      setNewDescription("");
      setNewIcon("📌");
      setNewColor("#3B82F6");
      onUpdate();
    } else {
      alert("作成に失敗しました");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("この状況タグを削除しますか？")) return;
    const result = await deleteSituation(id);
    if (result.success) {
      onUpdate();
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">🎬 状況タグ管理</h2>
        <p className="text-sm text-gray-600 mb-6">
          💡 「受付突破時」「担当者接続時」「ヒアリング時」など、営業の各フェーズを自由に定義できます。
          コール画面で選択すると、その状況に合ったタイムライン（トークセット）が展開されます。
        </p>

        {/* 新規作成フォーム */}
        <div className="bg-indigo-50 rounded-lg p-4 mb-6">
          <h3 className="font-bold text-indigo-800 mb-3">➕ 新しい状況タグを追加</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">アイコン</label>
              <input
                type="text"
                value={newIcon}
                onChange={(e) => setNewIcon(e.target.value)}
                placeholder="📌"
                className="w-full px-4 py-2 border-2 border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                maxLength={2}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">カラー</label>
              <input
                type="color"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                className="w-full h-10 border-2 border-indigo-300 rounded-lg"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">名前（必須）</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="例: 担当者接続時"
                className="w-full px-4 py-2 border-2 border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">説明</label>
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="例: 担当者が電話に出た直後のフェーズ"
                rows={2}
                className="w-full px-4 py-2 border-2 border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <button
            onClick={handleCreate}
            className="mt-4 w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg font-bold transition-all"
          >
            ➕ 作成する
          </button>
        </div>

        {/* 一覧 */}
        <div className="space-y-3">
          <h3 className="font-bold text-gray-800">現在の状況タグ一覧</h3>
          {situations.length === 0 && (
            <p className="text-center py-8 text-gray-500">まだ状況タグがありません</p>
          )}
          {situations.map((sit) => (
            <div
              key={sit.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border-2 border-gray-200 hover:border-indigo-400 transition-colors"
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
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
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

// カテゴリ管理コンポーネント
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

    const result = await createDynamicCategory(newName, newColor);
    if (result.success) {
      setNewName("");
      setNewColor("#6B7280");
      onUpdate();
    } else {
      alert("作成に失敗しました");
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">📂 カテゴリ管理</h2>
        <p className="text-sm text-gray-600 mb-6">
          💡 「断り文句」「チャンストーク」「ヒアリング」など、トークの種類を分類します。
          コール画面でレスポンストーク（武器庫）を表示する際に、このカテゴリごとに整理されます。
        </p>

        {/* 新規作成フォーム */}
        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <h3 className="font-bold text-blue-800 mb-3">➕ 新しいカテゴリを追加</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">名前（必須）</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="例: 断り文句"
                className="w-full px-4 py-2 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">カラー</label>
              <input
                type="color"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                className="w-full h-10 border-2 border-blue-300 rounded-lg"
              />
            </div>
          </div>
          <button
            onClick={handleCreate}
            className="mt-4 w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-bold transition-all"
          >
            ➕ 作成する
          </button>
        </div>

        {/* 一覧 */}
        <div className="space-y-3">
          <h3 className="font-bold text-gray-800">現在のカテゴリ一覧</h3>
          {categories.length === 0 && (
            <p className="text-center py-8 text-gray-500">まだカテゴリがありません</p>
          )}
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border-2 border-gray-200"
              style={{ borderLeftWidth: "6px", borderLeftColor: cat.color }}
            >
              <div>
                <h4 className="font-bold text-gray-800">{cat.name}</h4>
              </div>
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

// チェック項目管理コンポーネント
function CheckItemManager({
  checkItems,
  onUpdate,
}: {
  checkItems: CheckItem[];
  onUpdate: () => void;
}) {
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] = useState("");

  const handleCreate = async () => {
    if (!newName.trim()) {
      alert("名前を入力してください");
      return;
    }

    const result = await createCheckItem(newName, newDescription, newCategory);
    if (result.success) {
      setNewName("");
      setNewDescription("");
      setNewCategory("");
      onUpdate();
    } else {
      alert("作成に失敗しました");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("このチェック項目を削除しますか？")) return;
    const result = await deleteCheckItem(id);
    if (result.success) {
      onUpdate();
    }
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
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">✅ チェック項目管理</h2>
        <p className="text-sm text-gray-600 mb-6">
          💡 「予算の確認」「決裁権の確認」など、コール中に確認すべき項目を定義します。
          タイムラインに紐付けると、コール画面の右上にチェックリストとして表示されます。
        </p>

        {/* 新規作成フォーム */}
        <div className="bg-green-50 rounded-lg p-4 mb-6">
          <h3 className="font-bold text-green-800 mb-3">➕ 新しいチェック項目を追加</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">名前（必須）</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="例: 予算の確認"
                className="w-full px-4 py-2 border-2 border-green-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">説明</label>
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="例: BANT: Budget"
                rows={2}
                className="w-full px-4 py-2 border-2 border-green-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">カテゴリ</label>
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="例: BANT"
                className="w-full px-4 py-2 border-2 border-green-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
          <button
            onClick={handleCreate}
            className="mt-4 w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-bold transition-all"
          >
            ➕ 作成する
          </button>
        </div>

        {/* 一覧（カテゴリ別） */}
        <div className="space-y-4">
          <h3 className="font-bold text-gray-800">現在のチェック項目一覧</h3>
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
                    <div>
                      <h5 className="font-bold text-gray-800">{item.name}</h5>
                      {item.description && (
                        <p className="text-sm text-gray-600">{item.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm font-medium transition-colors"
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

// 単体トーク管理コンポーネント（既存のワークスペースから移植・簡略化）
function TalkManager({
  talks,
  categories,
  folders,
  onUpdate,
}: {
  talks: ScriptItem[];
  categories: Category[];
  folders: ScriptFolder[];
  onUpdate: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">💬 単体トーク（部品）管理</h2>
        <p className="text-sm text-gray-600 mb-6">
          💡 個別のトークを作成します。この画面は既存の機能と同じです。
          詳細な編集は、従来のワークスペースページ（`/workspace`）をご利用ください。
        </p>
        <Link
          href="/workspace"
          className="inline-block px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-bold transition-all"
        >
          📝 従来のワークスペースで編集する
        </Link>

        {/* 簡易一覧 */}
        <div className="mt-6 space-y-2">
          <h3 className="font-bold text-gray-800">登録されているトーク一覧（{talks.length}件）</h3>
          {talks.slice(0, 10).map((talk) => (
            <div
              key={talk.id}
              className="p-3 bg-gray-50 rounded-lg border border-gray-200"
            >
              <h4 className="font-bold text-gray-800">{talk.title}</h4>
              <p className="text-sm text-gray-600 truncate">{talk.content}</p>
            </div>
          ))}
          {talks.length > 10 && (
            <p className="text-sm text-gray-500 text-center">...他 {talks.length - 10} 件</p>
          )}
        </div>
      </div>
    </div>
  );
}

// タイムライン組み立てコンポーネント
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
  const [newTimelineDesc, setNewTimelineDesc] = useState("");

  const [timelineBlocks, setTimelineBlocks] = useState<ScriptItem[]>([]);
  const [timelineChecks, setTimelineChecks] = useState<CheckItem[]>([]);

  // 選択中のタイムラインのデータを読み込む
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

    const result = await createTimelineWithSituation(
      newTimelineTitle,
      selectedSituation,
      newTimelineDesc
    );

    if (result.success) {
      setNewTimelineTitle("");
      setNewTimelineDesc("");
      onUpdate();
      if (result.timelineId) {
        setSelectedTimeline(result.timelineId);
      }
    } else {
      alert("作成に失敗しました");
    }
  };

  const handleAddBlock = async (talkId: string) => {
    if (!selectedTimeline) return;

    const result = await addItemToTimeline(selectedTimeline, talkId);
    if (result.success) {
      loadTimelineData(selectedTimeline);
    }
  };

  const handleRemoveBlock = async (talkId: string) => {
    if (!selectedTimeline) return;

    const result = await removeBlockFromTimeline(selectedTimeline, talkId);
    if (result.success) {
      loadTimelineData(selectedTimeline);
    }
  };

  const handleAddCheck = async (checkId: string) => {
    if (!selectedTimeline) return;

    const result = await addCheckItemToTimeline(selectedTimeline, checkId);
    if (result.success) {
      loadTimelineData(selectedTimeline);
    }
  };

  const handleRemoveCheck = async (checkId: string) => {
    if (!selectedTimeline) return;

    const result = await removeCheckItemFromTimeline(selectedTimeline, checkId);
    if (result.success) {
      loadTimelineData(selectedTimeline);
    }
  };

  const handleDeleteTimeline = async () => {
    if (!selectedTimeline) return;
    if (!confirm("このタイムラインを削除しますか？")) return;

    const result = await deleteTimeline(selectedTimeline);
    if (result.success) {
      setSelectedTimeline("");
      setTimelineBlocks([]);
      setTimelineChecks([]);
      onUpdate();
    }
  };

  // 状況タグに紐づくタイムラインでフィルタ
  const filteredTimelines = selectedSituation
    ? timelines.filter((tl) => tl.situation_id === selectedSituation)
    : timelines;

  const selectedTimelineData = timelines.find((tl) => tl.id === selectedTimeline);
  const selectedSituationData = situations.find((sit) => sit.id === selectedSituation);

  // 既に追加されているトーク・チェックIDのセット
  const addedTalkIds = new Set(timelineBlocks.map((b) => b.id));
  const addedCheckIds = new Set(timelineChecks.map((c) => c.id));

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">🎯 タイムライン組み立て</h2>
        <p className="text-sm text-gray-600 mb-6">
          💡 状況タグを選択し、そのフェーズで使うトークとチェック項目を組み合わせます。
          コール画面では、状況タグをクリックすると、ここで組み立てたタイムラインが展開されます。
        </p>

        {/* Step 1: 状況タグ選択 */}
        <div className="bg-purple-50 rounded-lg p-4 mb-6">
          <h3 className="font-bold text-purple-800 mb-3">Step 1: 状況タグを選択</h3>
          <select
            value={selectedSituation}
            onChange={(e) => {
              setSelectedSituation(e.target.value);
              setSelectedTimeline("");
            }}
            className="w-full px-4 py-3 border-2 border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500"
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
            <div className="bg-indigo-50 rounded-lg p-4 mb-6">
              <h3 className="font-bold text-indigo-800 mb-3">
                Step 2: タイムラインを選択 or 新規作成
              </h3>

              {filteredTimelines.length > 0 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    既存のタイムラインを選択
                  </label>
                  <select
                    value={selectedTimeline}
                    onChange={(e) => setSelectedTimeline(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
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

              <div className="border-t-2 border-indigo-200 pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  新しいタイムラインを作成
                </label>
                <input
                  type="text"
                  value={newTimelineTitle}
                  onChange={(e) => setNewTimelineTitle(e.target.value)}
                  placeholder="タイトル（例: 基本ヒアリングフロー）"
                  className="w-full px-4 py-2 border-2 border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 mb-2"
                />
                <textarea
                  value={newTimelineDesc}
                  onChange={(e) => setNewTimelineDesc(e.target.value)}
                  placeholder="説明（任意）"
                  rows={2}
                  className="w-full px-4 py-2 border-2 border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={handleCreateTimeline}
                  className="mt-3 w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg font-bold transition-all"
                >
                  ➕ 新規タイムラインを作成
                </button>
              </div>
            </div>

            {/* Step 3: トークとチェック項目を組み合わせ */}
            {selectedTimeline && (
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-green-800">
                    Step 3: トークとチェック項目を組み合わせ
                  </h3>
                  <button
                    onClick={handleDeleteTimeline}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    🗑️ タイムライン削除
                  </button>
                </div>

                {selectedTimelineData && selectedSituationData && (
                  <div className="mb-4 p-3 bg-white rounded-lg border-2 border-green-300">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{selectedSituationData.icon}</span>
                      <div>
                        <h4 className="font-bold text-gray-800">
                          {selectedTimelineData.title}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {selectedSituationData.name} のタイムライン
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-6">
                  {/* 左: トークブロック */}
                  <div>
                    <h4 className="font-bold text-gray-800 mb-3">
                      💬 構成するトーク（順番に表示）
                    </h4>

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
                          className="flex items-center justify-between p-3 bg-white rounded-lg border-2 border-green-400"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-green-700">#{index + 1}</span>
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
                    <div className="bg-white rounded-lg border-2 border-dashed border-green-300 p-3">
                      <h5 className="text-sm font-bold text-gray-700 mb-2">➕ トークを追加</h5>
                      <div className="max-h-64 overflow-y-auto space-y-1">
                        {talks
                          .filter((t) => !addedTalkIds.has(t.id))
                          .map((talk) => (
                            <button
                              key={talk.id}
                              onClick={() => handleAddBlock(talk.id)}
                              className="w-full text-left px-3 py-2 bg-gray-50 hover:bg-green-100 rounded border border-gray-200 hover:border-green-400 transition-colors"
                            >
                              <span className="text-sm font-medium text-gray-800">
                                {talk.title}
                              </span>
                            </button>
                          ))}
                        {talks.filter((t) => !addedTalkIds.has(t.id)).length === 0 && (
                          <p className="text-xs text-gray-500 text-center py-2">
                            追加できるトークがありません
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 右: チェック項目 */}
                  <div>
                    <h4 className="font-bold text-gray-800 mb-3">
                      ✅ 確認すべきチェック項目
                    </h4>

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
                          className="flex items-center justify-between p-3 bg-white rounded-lg border-2 border-green-400"
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
                    <div className="bg-white rounded-lg border-2 border-dashed border-green-300 p-3">
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
                              className="w-full text-left px-3 py-2 bg-gray-50 hover:bg-green-100 rounded border border-gray-200 hover:border-green-400 transition-colors"
                            >
                              <span className="text-sm font-medium text-gray-800">
                                {check.name}
                              </span>
                              {check.category && (
                                <span className="text-xs text-gray-500 ml-2">
                                  ({check.category})
                                </span>
                              )}
                            </button>
                          ))}
                        {checkItems.filter((c) => !addedCheckIds.has(c.id)).length === 0 && (
                          <p className="text-xs text-gray-500 text-center py-2">
                            追加できるチェック項目がありません
                          </p>
                        )}
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
