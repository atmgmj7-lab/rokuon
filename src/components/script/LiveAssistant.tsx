"use client";

import { useState, useEffect } from "react";
import type { ScriptFlowData, ScriptNode, HypothesisTags } from "@/src/types/script";
import ScriptRunner from "./ScriptRunner";

interface LiveAssistantProps {
  flowData: ScriptFlowData;
  scriptTitle: string;
  scriptId: string;
}

export default function LiveAssistant({
  flowData,
  scriptTitle,
  scriptId,
}: LiveAssistantProps) {
  // プレ・コール調査のタグ選択
  const [selectedTags, setSelectedTags] = useState<HypothesisTags>({});
  const [matchedStartNode, setMatchedStartNode] = useState<string | null>(null);
  const [isPreCallComplete, setIsPreCallComplete] = useState(false);

  // タグを選択
  const handleTagSelect = (category: keyof HypothesisTags, value: string) => {
    setSelectedTags((prev) => ({
      ...prev,
      [category]: value,
    }));
  };

  // 最適な開始ノードを検索
  useEffect(() => {
    if (Object.keys(selectedTags).length === 0) {
      setMatchedStartNode(flowData.startNodeId);
      return;
    }

    // 開始ノード候補を取得
    const startNodes = flowData.nodes.filter(
      (node) => node.type === "start" || node.id === flowData.startNodeId
    );

    // マッチングスコアを計算
    let bestMatch: ScriptNode | null = null;
    let bestScore = 0;

    startNodes.forEach((node) => {
      if (!node.hypothesis_tags) {
        // タグがない場合はデフォルトとして低スコア
        if (bestScore === 0) {
          bestMatch = node;
        }
        return;
      }

      let score = 0;
      const tags = node.hypothesis_tags;

      // 各タグが一致するか確認
      if (selectedTags.hp && tags.hp === selectedTags.hp) score += 1;
      if (selectedTags.hiring && tags.hiring === selectedTags.hiring) score += 1;
      if (selectedTags.target && tags.target === selectedTags.target) score += 1;
      if (selectedTags.personality && tags.personality === selectedTags.personality)
        score += 1;

      if (score > bestScore) {
        bestScore = score;
        bestMatch = node;
      }
    });

    if (bestMatch) {
      setMatchedStartNode(bestMatch.id);
    } else {
      setMatchedStartNode(flowData.startNodeId);
    }
  }, [selectedTags, flowData]);

  // プレ・コール調査が完了したらカンペを表示
  if (isPreCallComplete && matchedStartNode) {
    const customFlowData = {
      ...flowData,
      startNodeId: matchedStartNode,
    };

    return (
      <div>
        <div className="absolute top-4 left-4 z-10">
          <button
            onClick={() => setIsPreCallComplete(false)}
            className="px-4 py-2 bg-white hover:bg-gray-100 rounded-lg shadow-md font-medium transition-colors"
          >
            ← プレ・コール調査に戻る
          </button>
        </div>
        <ScriptRunner
          flowData={customFlowData}
          scriptTitle={scriptTitle}
          scriptId={scriptId}
          showCommandPanel={true}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            🎯 プレ・コール調査
          </h1>
          <p className="text-gray-600">
            通話前に顧客の属性を選択すると、最適なトークが自動的に表示されます
          </p>
        </div>

        {/* タグ選択パネル */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          <div className="space-y-6">
            {/* Web状況 */}
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-3">
                🌐 Web状況
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: "none", label: "HPなし" },
                  { value: "sns_only", label: "SNSのみ" },
                  { value: "ads_active", label: "広告あり" },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleTagSelect("hp", option.value)}
                    className={`px-4 py-3 rounded-lg font-medium transition-all ${
                      selectedTags.hp === option.value
                        ? "bg-blue-600 text-white shadow-lg"
                        : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 求人状況 */}
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-3">
                👔 求人状況
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: "active", label: "募集中" },
                  { value: "none", label: "なし" },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleTagSelect("hiring", option.value)}
                    className={`px-4 py-3 rounded-lg font-medium transition-all ${
                      selectedTags.hiring === option.value
                        ? "bg-green-600 text-white shadow-lg"
                        : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ターゲット */}
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-3">
                🎯 ターゲット
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: "ceo", label: "社長" },
                  { value: "manager", label: "担当者" },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleTagSelect("target", option.value)}
                    className={`px-4 py-3 rounded-lg font-medium transition-all ${
                      selectedTags.target === option.value
                        ? "bg-purple-600 text-white shadow-lg"
                        : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* マッチング結果表示 */}
        {matchedStartNode && (
          <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl shadow-lg p-8 mb-6 border-2 border-purple-300">
            <h3 className="text-xl font-bold text-purple-800 mb-3">
              ✨ 最適なトークが見つかりました！
            </h3>
            <div className="bg-white rounded-lg p-4 mb-4">
              <div className="text-sm text-gray-600 mb-2">開始ノード:</div>
              <div className="font-medium text-gray-800">{matchedStartNode}</div>
              
              {/* 選択されたタグの表示 */}
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedTags.hp && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                    🌐 {selectedTags.hp}
                  </span>
                )}
                {selectedTags.hiring && (
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                    👔 {selectedTags.hiring}
                  </span>
                )}
                {selectedTags.target && (
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                    🎯 {selectedTags.target}
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => setIsPreCallComplete(true)}
              className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-bold text-lg shadow-lg transition-all"
            >
              📞 このトークで通話を開始
            </button>
          </div>
        )}

        {/* ヒント */}
        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <p className="text-sm text-yellow-800">
            💡 <strong>ヒント:</strong> 複数の属性を選択すると、より精密にマッチングします。
            選択しない項目は自動的に最適化されます。
          </p>
        </div>
      </div>
    </div>
  );
}
