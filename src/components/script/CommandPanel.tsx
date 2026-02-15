"use client";

import { useState, useEffect } from "react";
import { getKnowledgeByCategory, incrementKnowledgeUsage } from "@/src/actions/knowledge-actions";
import type { KnowledgeBase } from "@/src/types/script";

interface CommandPanelProps {
  onJumpToResponse: (knowledgeId: string, content: string, nextMoveHint?: string) => void;
}

export default function CommandPanel({ onJumpToResponse }: CommandPanelProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(false);

  const categories = [
    {
      id: "objection",
      name: "断り文句",
      icon: "🛡️",
      color: "from-red-500 to-orange-500",
    },
    {
      id: "question",
      name: "質問集",
      icon: "❓",
      color: "from-blue-500 to-cyan-500",
    },
    {
      id: "hearing",
      name: "ヒアリング項目",
      icon: "🎯",
      color: "from-green-500 to-emerald-500",
    },
    {
      id: "key_talk",
      name: "さしどころトーク",
      icon: "💎",
      color: "from-purple-500 to-pink-500",
    },
  ];

  const loadKnowledge = async (category: string) => {
    setLoading(true);
    const items = await getKnowledgeByCategory(
      category as "objection" | "question" | "hearing" | "key_talk"
    );
    setKnowledgeItems(items);
    setLoading(false);
  };

  const handleCategoryClick = (categoryId: string) => {
    if (activeCategory === categoryId) {
      setActiveCategory(null);
      setKnowledgeItems([]);
    } else {
      setActiveCategory(categoryId);
      loadKnowledge(categoryId);
    }
  };

  const handleKnowledgeClick = async (knowledge: KnowledgeBase) => {
    // 使用回数をインクリメント
    await incrementKnowledgeUsage(knowledge.id);
    
    // 親コンポーネントに通知（ジャンプ処理）
    onJumpToResponse(knowledge.id, knowledge.content, knowledge.next_move_hint);
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full">
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          🛡️ お守りパネル
        </h2>
        <p className="text-xs mt-1 opacity-90">
          困った時の切り返し集
        </p>
      </div>

      {/* カテゴリボタン */}
      <div className="p-4 space-y-2 border-b border-gray-200">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => handleCategoryClick(category.id)}
            className={`w-full px-4 py-3 rounded-lg font-medium transition-all text-left flex items-center justify-between ${
              activeCategory === category.id
                ? `bg-gradient-to-r ${category.color} text-white shadow-lg`
                : "bg-gray-100 hover:bg-gray-200 text-gray-700"
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="text-xl">{category.icon}</span>
              <span>{category.name}</span>
            </span>
            <span className="text-sm">
              {activeCategory === category.id ? "▼" : "▶"}
            </span>
          </button>
        ))}
      </div>

      {/* ナレッジアイテム */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="text-center py-8 text-gray-500">
            読み込み中...
          </div>
        ) : knowledgeItems.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            {activeCategory
              ? "このカテゴリにはまだナレッジがありません"
              : "カテゴリを選択してください"}
          </div>
        ) : (
          <div className="space-y-3">
            {knowledgeItems.map((item) => (
              <div
                key={item.id}
                className="bg-white border-2 border-gray-200 rounded-lg p-3 hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer"
                onClick={() => handleKnowledgeClick(item)}
              >
                <h3 className="font-bold text-sm text-gray-800 mb-1">
                  {item.title}
                </h3>
                <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                  {item.content}
                </p>
                
                {/* 戦略メモ */}
                {item.logic_explanation && (
                  <div className="bg-purple-50 rounded p-2 mb-2">
                    <p className="text-xs text-purple-700">
                      💡 {item.logic_explanation}
                    </p>
                  </div>
                )}

                {/* 次の一手 */}
                {item.next_move_hint && (
                  <div className="bg-green-50 rounded p-2 mb-2">
                    <p className="text-xs text-green-700">
                      ➡️ {item.next_move_hint}
                    </p>
                  </div>
                )}

                {/* 統計 */}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>使用: {item.usage_count}回</span>
                  {item.usage_count > 0 && (
                    <span className="text-green-600">
                      成功率: {Math.round((item.success_count / item.usage_count) * 100)}%
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
