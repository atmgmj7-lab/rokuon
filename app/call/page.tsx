"use client";

import { useState, useEffect } from "react";
import {
  getAllTimelines,
  getTimelineBlocks,
  getQuickResponseItems,
  getAllDynamicCategories,
  getResponsesByItem,
  getItemById,
} from "@/src/actions/workspace-actions";
import type { Timeline, ScriptItem, ItemResponse, Category } from "@/src/types/workspace";
import Link from "next/link";

export default function CallPage() {
  const [timelines, setTimelines] = useState<Timeline[]>([]);
  const [selectedTimelineId, setSelectedTimelineId] = useState<string | null>(null);
  const [timelineItems, setTimelineItems] = useState<ScriptItem[]>([]);
  const [quickResponseItems, setQuickResponseItems] = useState<ScriptItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [expandedPath, setExpandedPath] = useState<ScriptItem[]>([]);
  const [loading, setLoading] = useState(true);

  // データを読み込む
  const loadData = async () => {
    setLoading(true);

    const tls = await getAllTimelines();
    setTimelines(tls);

    const qr = await getQuickResponseItems();
    setQuickResponseItems(qr);

    const cats = await getAllDynamicCategories();
    setCategories(cats);

    // 最初のタイムラインを自動選択
    if (tls.length > 0 && !selectedTimelineId) {
      await loadTimeline(tls[0].id);
    }

    setLoading(false);
  };

  // タイムラインのトークを読み込む
  const loadTimeline = async (timelineId: string) => {
    setSelectedTimelineId(timelineId);
    const items = await getTimelineBlocks(timelineId);
    setTimelineItems(items);
    setExpandedItemId(null);
    setExpandedPath([]);
  };

  useEffect(() => {
    loadData();
  }, []);

  // アコーディオンを開閉
  const handleToggleItem = (itemId: string) => {
    if (expandedItemId === itemId) {
      setExpandedItemId(null);
    } else {
      setExpandedItemId(itemId);
    }
  };

  // 返答ボタンをクリック（多段展開）
  const handleResponseClick = async (parentItemId: string, nextItemId: string | undefined) => {
    if (!nextItemId) {
      alert("このパスは終了です");
      return;
    }

    // 次のアイテムを取得
    const nextItem = await getItemById(nextItemId);
    if (!nextItem) {
      alert("次のトークが見つかりません");
      return;
    }

    // パスに追加
    setExpandedPath((prev) => [...prev, nextItem]);
    setExpandedItemId(nextItemId);
  };

  // Quick Responseをグループ化
  const groupedQuickResponse: { [categoryId: string]: ScriptItem[] } = {};
  quickResponseItems.forEach((item) => {
    const catId = item.category_id || "uncategorized";
    if (!groupedQuickResponse[catId]) {
      groupedQuickResponse[catId] = [];
    }
    groupedQuickResponse[catId].push(item);
  });

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
      <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white px-6 py-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">📞 実戦コックピット（コール画面）</h1>
            <p className="text-sm opacity-90 mt-1">
              💡 状況に合わせて手札を開き、顧客の反応に応じて分岐させてください
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/workspace"
              className="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-lg text-sm font-medium transition-colors"
            >
              📁 ワークスペースへ（武器を作る）
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

      {/* タイムライン選択 */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200 p-6 shadow-md">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">🎬</span>
            <h2 className="text-lg font-bold text-gray-800">
              どの状況・シーンですか？（タップして手札を表示）
            </h2>
          </div>

          {timelines.length === 0 && (
            <div className="text-center py-8 bg-white rounded-lg">
              <p className="text-gray-600 mb-4">タイムラインがまだ作成されていません</p>
              <Link
                href="/workspace"
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors inline-block"
              >
                ワークスペースで作成する
              </Link>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {timelines.map((timeline) => (
              <button
                key={timeline.id}
                onClick={() => loadTimeline(timeline.id)}
                className={`px-6 py-3 rounded-xl font-bold transition-all transform hover:scale-105 ${
                  selectedTimelineId === timeline.id
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg ring-4 ring-blue-300"
                    : "bg-white text-gray-700 hover:bg-blue-100 border-2 border-gray-300 shadow-md"
                }`}
                title={timeline.description}
              >
                {timeline.title}
              </button>
            ))}
          </div>

          {selectedTimelineId && (
            <div className="mt-4 p-3 bg-white rounded-lg border border-blue-200">
              <p className="text-sm text-gray-600">
                💬 <strong>使い方:</strong> 下のトークタイトルをクリックして展開し、読み上げてください。
                顧客の反応に応じて分岐ボタンを押すと、次のトークが自動で展開されます。
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* 中央: タイムライン・アコーディオン */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <div className="max-w-5xl mx-auto">
            {timelineItems.length === 0 && selectedTimelineId && (
              <div className="text-center py-20 bg-white rounded-xl shadow-md">
                <span className="text-6xl mb-4 block">📭</span>
                <p className="text-lg text-gray-600 mb-4">
                  このタイムラインにはまだトークがありません
                </p>
                <Link
                  href="/workspace"
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors inline-block"
                >
                  ワークスペースでトークを追加
                </Link>
              </div>
            )}

            {!selectedTimelineId && (
              <div className="text-center py-20 bg-white rounded-xl shadow-md">
                <span className="text-6xl mb-4 block">👆</span>
                <p className="text-lg text-gray-600">
                  上部からタイムラインを選択してください
                </p>
              </div>
            )}

            {/* タイムラインのトークアイテム（アコーディオン） */}
            <div className="space-y-3">
              {timelineItems.map((item) => (
                <TalkAccordion
                  key={item.id}
                  item={item}
                  isExpanded={expandedItemId === item.id}
                  onToggle={() => handleToggleItem(item.id)}
                  onResponseClick={handleResponseClick}
                />
              ))}
            </div>

            {/* 展開されたパス（多段展開） */}
            {expandedPath.length > 0 && (
              <div className="mt-8 pt-8 border-t-4 border-green-300">
                <h2 className="text-xl font-bold text-green-700 mb-4 flex items-center gap-2">
                  <span>↳</span> 次のトーク（分岐展開）
                </h2>
                <div className="space-y-3">
                  {expandedPath.map((item, index) => (
                    <div key={`${item.id}-${index}`} className="ml-8">
                      <TalkAccordion
                        item={item}
                        isExpanded={true}
                        onToggle={() => {}}
                        onResponseClick={handleResponseClick}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 右: Quick Response（常備武器） */}
        <div className="w-96 bg-white border-l-2 border-orange-300 flex flex-col overflow-hidden shadow-xl">
          <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-4">
            <h2 className="text-lg font-bold">🛡️ Quick Response（常備武器）</h2>
            <p className="text-xs opacity-90 mt-1">
              想定外の質問や強い断りが出た場合は、ここから回答を引き出してください
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {quickResponseItems.length === 0 && (
              <div className="text-center py-12 text-gray-500 text-sm">
                <p className="mb-4">Quick Responseがありません</p>
                <p className="text-xs mb-4">
                  ワークスペースでトークを作成し、<br />
                  「Quick Response設定」をONにしてください
                </p>
                <Link
                  href="/workspace"
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors inline-block"
                >
                  ワークスペースへ
                </Link>
              </div>
            )}

            {/* カテゴリ別にグループ化して表示 */}
            {Object.keys(groupedQuickResponse).map((categoryId) => {
              const category = categories.find((c) => c.id === categoryId);
              const categoryName = category ? category.name : "未分類";
              const items = groupedQuickResponse[categoryId];

              return (
                <div key={categoryId} className="mb-4">
                  <h3 className="text-sm font-bold text-gray-700 mb-2 px-2 py-1 bg-gray-100 rounded">
                    {categoryName}
                  </h3>
                  <div className="space-y-2">
                    {items.map((item) => (
                      <QuickResponseButton key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// トークアコーディオンコンポーネント
function TalkAccordion({
  item,
  isExpanded,
  onToggle,
  onResponseClick,
}: {
  item: ScriptItem;
  isExpanded: boolean;
  onToggle: () => void;
  onResponseClick: (parentItemId: string, nextItemId: string | undefined) => void;
}) {
  const [responses, setResponses] = useState<ItemResponse[]>([]);

  useEffect(() => {
    const fetchResponses = async () => {
      const itemResponses = await getResponsesByItem(item.id);
      setResponses(itemResponses);
    };
    fetchResponses();
  }, [item.id]);

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden border-2 border-gray-200 hover:border-blue-400 transition-colors">
      {/* アコーディオンヘッダー（タイトルのみ） */}
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-blue-50 transition-colors"
      >
        <div className="flex items-center gap-3 flex-1 text-left">
          <span className="text-2xl">{isExpanded ? "📖" : "📕"}</span>
          <div>
            <h3 className="text-lg font-bold text-gray-800">{item.title}</h3>
            {item.hearing_purpose && !isExpanded && (
              <p className="text-sm text-blue-600 mt-1">🎯 {item.hearing_purpose}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {responses.length > 0 && (
            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
              分岐 {responses.length}
            </span>
          )}
          <span className="text-xl text-gray-400">
            {isExpanded ? "▲" : "▼"}
          </span>
        </div>
      </button>

      {/* アコーディオン本体（展開時） */}
      {isExpanded && (
        <div className="px-6 py-4 bg-gray-50 border-t-2 border-gray-200">
          {/* ヒアリングすべき内容 */}
          {item.hearing_purpose && (
            <div className="mb-3 p-4 bg-blue-50 rounded-lg border-2 border-blue-300">
              <p className="text-sm font-bold text-blue-700 flex items-center gap-2">
                <span className="text-lg">🎯</span> ヒアリングすべき内容
              </p>
              <p className="text-blue-800 mt-2">{item.hearing_purpose}</p>
            </div>
          )}

          {/* 実際の聞き方 */}
          <div className="mb-3 p-5 bg-green-50 rounded-lg border-2 border-green-400">
            <p className="text-sm font-bold text-green-700 flex items-center gap-2 mb-3">
              <span className="text-lg">🗣️</span> 実際の聞き方（読み上げてください）
            </p>
            <p className="text-gray-800 whitespace-pre-wrap leading-relaxed font-medium text-xl">
              {item.content}
            </p>
          </div>

          {/* トップの狙い */}
          {item.strategy_note && (
            <div className="mb-3 p-4 bg-purple-50 rounded-lg border-2 border-purple-300">
              <p className="text-sm font-bold text-purple-700 flex items-center gap-2">
                <span className="text-lg">💡</span> トップの狙い
              </p>
              <p className="text-purple-800 mt-2">{item.strategy_note}</p>
            </div>
          )}

          {/* 返答ボタン（分岐） */}
          {responses.length > 0 && (
            <div className="mt-4 pt-4 border-t-2 border-gray-300">
              <p className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <span className="text-lg">↓</span> 顧客の反応を選んでください:
              </p>
              <div className="flex flex-wrap gap-2">
                {responses.map((response) => (
                  <button
                    key={response.id}
                    onClick={() => onResponseClick(item.id, response.next_item_id)}
                    className="px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-bold transition-all transform hover:scale-105 shadow-lg"
                  >
                    {response.response_text}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Quick Responseボタンコンポーネント
function QuickResponseButton({ item }: { item: ScriptItem }) {
  const [showDetail, setShowDetail] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowDetail(true)}
        className="w-full px-4 py-3 bg-white hover:bg-orange-50 border-2 border-gray-200 hover:border-orange-400 rounded-lg text-left transition-all shadow-sm hover:shadow-md"
      >
        <div className="font-bold text-gray-800">{item.title}</div>
        {item.hearing_purpose && (
          <div className="text-xs text-blue-600 mt-1">🎯 {item.hearing_purpose}</div>
        )}
      </button>

      {/* 詳細モーダル */}
      {showDetail && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowDetail(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">{item.title}</h2>
              <button
                onClick={() => setShowDetail(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium transition-colors"
              >
                ✖️ 閉じる
              </button>
            </div>

            {item.hearing_purpose && (
              <div className="mb-4 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                <h3 className="font-bold text-blue-800 mb-2">🎯 ヒアリングすべき内容</h3>
                <p className="text-blue-700">{item.hearing_purpose}</p>
              </div>
            )}

            <div className="mb-4 p-5 bg-green-50 rounded-lg border-2 border-green-300">
              <h3 className="font-bold text-green-800 mb-2">🗣️ 実際の聞き方</h3>
              <p className="text-gray-800 whitespace-pre-wrap text-lg leading-relaxed">
                {item.content}
              </p>
            </div>

            {item.strategy_note && (
              <div className="p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
                <h3 className="font-bold text-purple-800 mb-2">💡 トップの狙い</h3>
                <p className="text-purple-700 whitespace-pre-wrap">{item.strategy_note}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
