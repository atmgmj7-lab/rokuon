"use client";

import { useState, useEffect } from "react";
import {
  getAllSituations,
  getMainScenarioItems,
  getComponentsBySituation,
  getComponentsByCheckItem,
  getQuickResponseItems,
  getAllDynamicCategories,
  getAllCheckItems,
  getResponsesByItem,
  getItemById,
} from "@/src/actions/workspace-actions";
import type { Situation, ScriptItem, CheckItem, Category, ItemResponse } from "@/src/types/workspace";
import Link from "next/link";

type TabType = "main_scenario" | string;

export default function CallPage() {
  const [situations, setSituations] = useState<Situation[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("main_scenario");
  const [mainScenarioItems, setMainScenarioItems] = useState<ScriptItem[]>([]);
  const [situationComponents, setSituationComponents] = useState<ScriptItem[]>([]);
  const [dynamicComponents, setDynamicComponents] = useState<ScriptItem[]>([]);
  const [checkItems, setCheckItems] = useState<CheckItem[]>([]);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [quickResponseItems, setQuickResponseItems] = useState<ScriptItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [expandedPath, setExpandedPath] = useState<ScriptItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);

    const [sits, mainItems, chks, qr, cats] = await Promise.all([
      getAllSituations(),
      getMainScenarioItems(),
      getAllCheckItems(),
      getQuickResponseItems(),
      getAllDynamicCategories(),
    ]);

    setSituations(sits);
    setMainScenarioItems(mainItems);
    setCheckItems(chks);
    setQuickResponseItems(qr);
    setCategories(cats);

    setLoading(false);
  };

  const handleSelectTab = async (tabId: TabType) => {
    setActiveTab(tabId);
    setExpandedItemId(null);
    setExpandedPath([]);
    setDynamicComponents([]);

    if (tabId !== "main_scenario") {
      const components = await getComponentsBySituation(tabId);
      setSituationComponents(components);
    } else {
      setSituationComponents([]);
    }
  };

  const handleToggleCheck = async (checkId: string) => {
    const newCheckedItems = new Set(checkedItems);
    
    if (newCheckedItems.has(checkId)) {
      newCheckedItems.delete(checkId);
      setDynamicComponents((prev) => 
        prev.filter((item) => item.trigger_check_item_id !== checkId)
      );
    } else {
      newCheckedItems.add(checkId);
      const newComponents = await getComponentsByCheckItem(checkId);
      setDynamicComponents((prev) => [...prev, ...newComponents]);
    }

    setCheckedItems(newCheckedItems);
  };

  const handleToggleItem = (itemId: string) => {
    if (expandedItemId === itemId) {
      setExpandedItemId(null);
    } else {
      setExpandedItemId(itemId);
    }
  };

  const handleResponseClick = async (parentItemId: string, nextItemId: string | undefined) => {
    if (!nextItemId) {
      alert("このパスは終了です");
      return;
    }

    const nextItem = await getItemById(nextItemId);
    if (!nextItem) {
      alert("次のトークが見つかりません");
      return;
    }

    setExpandedPath((prev) => [...prev, nextItem]);
    setExpandedItemId(nextItemId);
  };

  useEffect(() => {
    loadData();
  }, []);

  const displayItems =
    activeTab === "main_scenario"
      ? [...mainScenarioItems, ...dynamicComponents]
      : [...situationComponents, ...dynamicComponents];

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
      <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white px-6 py-3 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">📞 実戦コックピット</h1>
            <p className="text-xs opacity-90 mt-1">
              💡 基本シナリオスタート → チェック項目で動的展開
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/workspace"
              className="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-lg text-sm font-medium transition-colors"
            >
              📁 ワークスペースへ
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

      {/* タブナビゲーション */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200 shadow-md">
        <div className="max-w-7xl mx-auto flex overflow-x-auto">
          <button
            onClick={() => handleSelectTab("main_scenario")}
            className={`px-6 py-4 font-bold transition-all whitespace-nowrap ${
              activeTab === "main_scenario"
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-b-4 border-blue-800"
                : "bg-white text-gray-700 hover:bg-blue-100 border-b-2 border-transparent"
            }`}
          >
            📖 基本シナリオ（代表突破）
          </button>

          {situations.map((sit) => (
            <button
              key={sit.id}
              onClick={() => handleSelectTab(sit.id)}
              className={`px-6 py-4 font-bold transition-all whitespace-nowrap ${
                activeTab === sit.id
                  ? "text-white border-b-4"
                  : "bg-white text-gray-700 hover:bg-gray-100 border-b-2 border-transparent"
              }`}
              style={{
                backgroundColor: activeTab === sit.id ? sit.color : undefined,
                borderBottomColor: activeTab === sit.id ? sit.color : undefined,
              }}
            >
              {sit.icon} {sit.name}
            </button>
          ))}

          {situations.length === 0 && (
            <div className="px-6 py-4 text-sm text-gray-500 bg-white">
              ※ワークスペースで状況タグを作成してください
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* 中央: トーク */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          <div className="max-w-4xl mx-auto">
            {displayItems.length === 0 && (
              <div className="text-center py-20 bg-white rounded-xl shadow-md">
                <span className="text-6xl mb-4 block">📭</span>
                <p className="text-lg text-gray-600 mb-3">
                  {activeTab === "main_scenario"
                    ? "基本シナリオがまだありません"
                    : "この状況タブに紐づく部品トークがありません"}
                </p>
                <Link
                  href="/workspace"
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors inline-block"
                >
                  ワークスペースでトークを作成
                </Link>
              </div>
            )}

            {displayItems.length > 0 && (
              <div>
                {activeTab === "main_scenario" && (
                  <div className="mb-4 p-4 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg border-2 border-blue-300 shadow-md">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">📖</span>
                      <div>
                        <h3 className="text-lg font-bold text-gray-800">
                          基本シナリオ（代表突破〜担当者接続まで）
                        </h3>
                        <p className="text-sm text-gray-700">
                          💬 まずはこのトークで進めてください。右上のチェック項目がONになると、追加のトークが自動で表示されます。
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {displayItems.map((item, index) => {
                    const isDynamic = dynamicComponents.some((d) => d.id === item.id);
                    return (
                      <div
                        key={item.id}
                        className={`transition-all duration-500 ${
                          isDynamic ? "animate-fadeIn" : ""
                        }`}
                      >
                        <TalkAccordion
                          item={item}
                          index={index + 1}
                          isExpanded={expandedItemId === item.id}
                          isDynamic={isDynamic}
                          onToggle={() => handleToggleItem(item.id)}
                          onResponseClick={handleResponseClick}
                        />
                      </div>
                    );
                  })}
                </div>

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
                            index={displayItems.length + index + 1}
                            isExpanded={true}
                            isDynamic={false}
                            onToggle={() => {}}
                            onResponseClick={handleResponseClick}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 右: チェック＆武器庫 */}
        <div className="w-80 bg-white border-l-4 border-orange-400 flex flex-col overflow-hidden shadow-xl">
          <div className="border-b-2 border-orange-300">
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white p-3">
              <h2 className="text-sm font-bold">✅ チェック項目</h2>
              <p className="text-xs opacity-90 mt-1">
                クリックでON → 追加トークが動的に表示
              </p>
            </div>

            <div className="p-3 max-h-80 overflow-y-auto">
              {checkItems.length === 0 && (
                <p className="text-center py-6 text-gray-500 text-sm">
                  ワークスペースでチェック項目を作成してください
                </p>
              )}
              {checkItems.map((check) => {
                const isChecked = checkedItems.has(check.id);
                return (
                  <button
                    key={check.id}
                    onClick={() => handleToggleCheck(check.id)}
                    className={`w-full text-left px-3 py-2 mb-2 rounded-lg border-2 transition-all ${
                      isChecked
                        ? "bg-green-100 border-green-500 ring-2 ring-green-300"
                        : "bg-white border-gray-200 hover:border-green-400"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-xl ${isChecked ? "text-green-600" : "text-gray-400"}`}>
                        {isChecked ? "✅" : "⬜"}
                      </span>
                      <div>
                        <h4 className={`text-sm font-bold ${isChecked ? "text-green-800" : "text-gray-800"}`}>
                          {check.name}
                        </h4>
                        {check.description && (
                          <p className="text-xs text-gray-600">{check.description}</p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-3">
              <h2 className="text-sm font-bold">🛡️ Quick Response</h2>
              <p className="text-xs opacity-90 mt-1">想定外の質問に即対応</p>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {quickResponseItems.length === 0 && (
                <div className="text-center py-12 text-gray-500 text-sm">
                  <p className="mb-3">レスポンストークがありません</p>
                  <Link
                    href="/workspace"
                    className="px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-medium transition-colors inline-block"
                  >
                    ワークスペースへ
                  </Link>
                </div>
              )}

              {Object.keys(groupedQuickResponse).map((categoryId) => {
                const category = categories.find((c) => c.id === categoryId);
                const categoryName = category ? category.name : "未分類";
                const items = groupedQuickResponse[categoryId];

                return (
                  <div key={categoryId} className="mb-4">
                    <h3 className="text-xs font-bold text-gray-700 mb-2 px-2 py-1 bg-gray-100 rounded">
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

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}

function TalkAccordion({
  item,
  index,
  isExpanded,
  isDynamic,
  onToggle,
  onResponseClick,
}: {
  item: ScriptItem;
  index: number;
  isExpanded: boolean;
  isDynamic: boolean;
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
    <div
      className={`bg-white rounded-xl shadow-md overflow-hidden border-2 transition-all ${
        isDynamic
          ? "border-green-400 ring-4 ring-green-200"
          : "border-gray-200 hover:border-blue-400"
      }`}
    >
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-blue-50 transition-colors"
      >
        <div className="flex items-center gap-3 flex-1 text-left">
          <span className="text-lg font-bold text-blue-600">#{index}</span>
          {isDynamic && (
            <span className="px-2 py-1 bg-green-500 text-white rounded-full text-xs font-bold animate-pulse">
              NEW
            </span>
          )}
          <span className="text-xl">{isExpanded ? "📖" : "📕"}</span>
          <div>
            <h3 className="text-base font-bold text-gray-800">{item.title}</h3>
            {item.hearing_purpose && !isExpanded && (
              <p className="text-xs text-blue-600 mt-1">🎯 {item.hearing_purpose}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {responses.length > 0 && (
            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
              分岐 {responses.length}
            </span>
          )}
          <span className="text-lg text-gray-400">{isExpanded ? "▲" : "▼"}</span>
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 py-3 bg-gray-50 border-t-2 border-gray-200">
          {item.hearing_purpose && (
            <div className="mb-3 p-3 bg-blue-50 rounded-lg border-2 border-blue-300">
              <p className="text-xs font-bold text-blue-700 flex items-center gap-2">
                <span>🎯</span> ヒアリングすべき内容
              </p>
              <p className="text-blue-800 mt-1 text-sm">{item.hearing_purpose}</p>
            </div>
          )}

          <div className="mb-3 p-4 bg-green-50 rounded-lg border-2 border-green-400">
            <p className="text-xs font-bold text-green-700 flex items-center gap-2 mb-2">
              <span>🗣️</span> 実際の聞き方
            </p>
            <p className="text-gray-800 whitespace-pre-wrap leading-relaxed font-medium text-lg">
              {item.content}
            </p>
          </div>

          {item.strategy_note && (
            <div className="mb-3 p-3 bg-purple-50 rounded-lg border-2 border-purple-300">
              <p className="text-xs font-bold text-purple-700 flex items-center gap-2">
                <span>💡</span> トップの狙い
              </p>
              <p className="text-purple-800 mt-1 text-sm">{item.strategy_note}</p>
            </div>
          )}

          {responses.length > 0 && (
            <div className="mt-3 pt-3 border-t-2 border-gray-300">
              <p className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-2">
                <span>↓</span> 顧客の反応:
              </p>
              <div className="flex flex-wrap gap-2">
                {responses.map((response) => (
                  <button
                    key={response.id}
                    onClick={() => onResponseClick(item.id, response.next_item_id)}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-bold transition-all transform hover:scale-105 shadow-lg text-sm"
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

function QuickResponseButton({ item }: { item: ScriptItem }) {
  const [showDetail, setShowDetail] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowDetail(true)}
        className="w-full px-3 py-2 bg-white hover:bg-orange-50 border-2 border-gray-200 hover:border-orange-400 rounded-lg text-left transition-all shadow-sm hover:shadow-md"
      >
        <div className="font-bold text-gray-800 text-sm">{item.title}</div>
        {item.hearing_purpose && (
          <div className="text-xs text-blue-600 mt-1">🎯 {item.hearing_purpose}</div>
        )}
      </button>

      {showDetail && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowDetail(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">{item.title}</h2>
              <button
                onClick={() => setShowDetail(false)}
                className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium transition-colors"
              >
                ✖️
              </button>
            </div>

            {item.hearing_purpose && (
              <div className="mb-3 p-3 bg-blue-50 rounded-lg border-2 border-blue-200">
                <h3 className="font-bold text-blue-800 mb-2 text-sm">🎯 ヒアリング内容</h3>
                <p className="text-blue-700">{item.hearing_purpose}</p>
              </div>
            )}

            <div className="mb-3 p-4 bg-green-50 rounded-lg border-2 border-green-300">
              <h3 className="font-bold text-green-800 mb-2 text-sm">🗣️ 実際の聞き方</h3>
              <p className="text-gray-800 whitespace-pre-wrap text-base leading-relaxed">
                {item.content}
              </p>
            </div>

            {item.strategy_note && (
              <div className="p-3 bg-purple-50 rounded-lg border-2 border-purple-200">
                <h3 className="font-bold text-purple-800 mb-2 text-sm">💡 トップの狙い</h3>
                <p className="text-purple-700 whitespace-pre-wrap">{item.strategy_note}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
