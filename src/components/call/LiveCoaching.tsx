"use client";

import { useState, useEffect } from "react";
import type { ScriptItem } from "@/src/types/workspace";
import type { EnrichedScriptItem } from "@/src/types/call";

interface LiveCoachingProps {
  baseTalk: ScriptItem[]; // 全員共通の基本トーク
  suggestedTalks: EnrichedScriptItem[]; // 状況に応じた助言トーク
  onItemClick: (item: ScriptItem | EnrichedScriptItem) => void;
}

export default function LiveCoaching({
  baseTalk,
  suggestedTalks,
  onItemClick,
}: LiveCoachingProps) {
  const [animateSuggestions, setAnimateSuggestions] = useState(false);

  // 提案トークが変更されたらアニメーション
  useEffect(() => {
    if (suggestedTalks.length > 0) {
      setAnimateSuggestions(true);
      const timer = setTimeout(() => setAnimateSuggestions(false), 600);
      return () => clearTimeout(timer);
    }
  }, [suggestedTalks]);

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* 基本トーク */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">📄</span>
            <h2 className="text-2xl font-bold text-gray-800">基本トーク</h2>
            <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-sm font-medium">
              全員共通
            </span>
          </div>

          {baseTalk.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p>基本トークが設定されていません</p>
            </div>
          )}

          <div className="space-y-4">
            {baseTalk.map((item, index) => (
              <div
                key={item.id}
                className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-gray-300"
                onClick={() => onItemClick(item)}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl font-bold text-gray-400">
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-800 mb-3">
                      {item.title}
                    </h3>
                    <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {item.content}
                    </p>
                    {item.strategy_note && (
                      <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                        <p className="text-sm text-purple-700">
                          💡 <strong>戦略:</strong> {item.strategy_note}
                        </p>
                      </div>
                    )}
                    {item.next_move_hint && (
                      <div className="mt-2 p-3 bg-green-50 rounded-lg border border-green-200">
                        <p className="text-sm text-green-700">
                          ➡️ <strong>次の一手:</strong> {item.next_move_hint}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* トップからの助言（状況に応じた提案） */}
        {suggestedTalks.length > 0 && (
          <section
            className={`transition-all duration-500 ${
              animateSuggestions
                ? "opacity-0 translate-y-4"
                : "opacity-100 translate-y-0"
            }`}
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">🎯</span>
              <h2 className="text-2xl font-bold text-orange-600">
                トップからの助言
              </h2>
              <span className="px-3 py-1 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full text-sm font-medium animate-pulse">
                状況に応じた提案
              </span>
            </div>

            <div className="space-y-4">
              {suggestedTalks.map((item, index) => (
                <div
                  key={item.id}
                  className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl shadow-lg p-6 hover:shadow-2xl transition-all cursor-pointer border-l-4 border-orange-500 transform hover:scale-[1.02]"
                  onClick={() => onItemClick(item)}
                  style={{
                    animationDelay: `${index * 0.1}s`,
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold">
                        {index + 1}
                      </div>
                      {item.match_score && (
                        <div className="text-xs text-center text-orange-600 font-medium mt-1">
                          マッチ度<br />{item.match_score}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-xl font-bold text-orange-800">
                          じゃあこれ聞いてみて！
                        </h3>
                      </div>
                      <h4 className="text-lg font-semibold text-gray-800 mb-3">
                        {item.title}
                      </h4>
                      <p className="text-gray-700 whitespace-pre-wrap leading-relaxed mb-3">
                        {item.content}
                      </p>
                      {item.strategy_note && (
                        <div className="p-4 bg-white rounded-lg border-2 border-orange-200 mb-2">
                          <p className="text-sm text-orange-800">
                            💡 <strong>トップの狙い:</strong> {item.strategy_note}
                          </p>
                        </div>
                      )}
                      {item.next_move_hint && (
                        <div className="p-3 bg-white rounded-lg border-2 border-green-300">
                          <p className="text-sm text-green-700">
                            ➡️ <strong>次はこれ:</strong> {item.next_move_hint}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 状況が選択されていない場合のメッセージ */}
        {suggestedTalks.length === 0 && baseTalk.length > 0 && (
          <div className="text-center py-12 bg-white rounded-xl shadow-md">
            <span className="text-6xl mb-4 block">👆</span>
            <p className="text-lg text-gray-600">
              上部の「現在の状況」をポチポチ選択すると、<br />
              <strong className="text-orange-600">
                トップアポインターからの助言
              </strong>
              がここに出現します！
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
