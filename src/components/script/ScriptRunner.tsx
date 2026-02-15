"use client";

import { useState, useEffect } from "react";
import type { ScriptFlowData, ScriptNode, ScriptOption } from "@/src/types/script";
import { saveScriptLog } from "@/src/actions/script-actions";
import CommandPanel from "./CommandPanel";
import NextMoveHint from "./NextMoveHint";

interface ScriptRunnerProps {
  flowData: ScriptFlowData;
  scriptTitle: string;
  scriptId: string;
  showCommandPanel?: boolean;
}

export default function ScriptRunner({ flowData, scriptTitle, scriptId, showCommandPanel = false }: ScriptRunnerProps) {
  const [currentNodeId, setCurrentNodeId] = useState<string>(flowData.startNodeId);
  const [history, setHistory] = useState<Array<{ nodeId: string; selectedOption?: string }>>([]);
  const [currentNode, setCurrentNode] = useState<ScriptNode | null>(null);
  const [logSaved, setLogSaved] = useState(false);
  const [nextMoveHint, setNextMoveHint] = useState<string | null>(null);
  const [jumpedContent, setJumpedContent] = useState<string | null>(null);

  // 現在のノードを取得
  useEffect(() => {
    const node = flowData.nodes.find((n) => n.id === currentNodeId);
    setCurrentNode(node || null);
  }, [currentNodeId, flowData.nodes]);

  // 終了ノードに到達したときにログを保存
  useEffect(() => {
    const saveLog = async () => {
      if (currentNode && currentNode.type === "end" && !logSaved) {
        // 通過したノードIDの配列を作成
        const pathHistory = [
          flowData.startNodeId,
          ...history.map((h) => h.nodeId),
          currentNodeId,
        ];

        // 結果ステータスを判定（ノードIDから推測）
        let resultStatus = "completed";
        if (currentNodeId.includes("demo") || currentNodeId.includes("appointment")) {
          resultStatus = "appointment";
        } else if (currentNodeId.includes("reject") || currentNodeId.includes("busy")) {
          resultStatus = "rejected";
        } else if (currentNodeId.includes("material")) {
          resultStatus = "material_sent";
        }

        // ログを保存
        await saveScriptLog(scriptId, pathHistory, resultStatus);
        setLogSaved(true);
        console.log("📊 スクリプトログを保存しました:", { pathHistory, resultStatus });
      }
    };

    saveLog();
  }, [currentNode, currentNodeId, history, flowData.startNodeId, scriptId, logSaved]);

  // 選択肢をクリック
  const handleOptionClick = (option: ScriptOption) => {
    setHistory([...history, { nodeId: currentNodeId, selectedOption: option.label }]);
    setCurrentNodeId(option.nextNodeId);
  };

  // 前に戻る
  const handleBack = () => {
    if (history.length > 0) {
      const newHistory = [...history];
      const previous = newHistory.pop();
      setHistory(newHistory);
      if (previous) {
        setCurrentNodeId(previous.nodeId);
      }
    }
  };

  // リセット
  const handleReset = () => {
    setCurrentNodeId(flowData.startNodeId);
    setHistory([]);
    setLogSaved(false);
    setNextMoveHint(null);
    setJumpedContent(null);
  };

  // コマンドパネルからのジャンプ処理
  const handleJumpToResponse = (knowledgeId: string, content: string, nextHint?: string) => {
    setJumpedContent(content);
    if (nextHint) {
      setNextMoveHint(nextHint);
    }
  };

  // NextMoveHintの承認
  const handleAcceptHint = () => {
    // ヒントを閉じる（実際のノード遷移は手動で行う）
    setNextMoveHint(null);
  };

  // NextMoveHintの却下
  const handleDismissHint = () => {
    setNextMoveHint(null);
  };

  if (!currentNode) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">❌ ノードが見つかりません</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex">
      <div className="flex-1 p-4">
        <div className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-800">📞 {scriptTitle}</h1>
            <div className="flex gap-2">
              {history.length > 0 && (
                <button
                  onClick={handleBack}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors"
                >
                  ← 戻る
                </button>
              )}
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg font-medium transition-colors"
              >
                🔄 最初から
              </button>
            </div>
          </div>
        </div>

        {/* 履歴表示 */}
        {history.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-4 mb-4">
            <h2 className="text-sm font-semibold text-gray-600 mb-2">📝 会話履歴</h2>
            <div className="space-y-1">
              {history.map((item, index) => {
                const node = flowData.nodes.find((n) => n.id === item.nodeId);
                return (
                  <div key={index} className="text-sm">
                    <span className="text-gray-500">
                      {index + 1}. {node?.content.substring(0, 30)}...
                    </span>
                    {item.selectedOption && (
                      <span className="ml-2 text-blue-600 font-medium">
                        → {item.selectedOption}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* メインコンテンツ */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-4">
          {/* ノードタイプバッジ */}
          <div className="mb-4">
            {currentNode.type === "message" && (
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                💬 メッセージ
              </span>
            )}
            {currentNode.type === "question" && (
              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                ❓ 質問
              </span>
            )}
            {currentNode.type === "end" && (
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                ✅ 終了
              </span>
            )}
          </div>

          {/* ノードコンテンツ */}
          <div className="mb-6">
            <div className="text-xl leading-relaxed text-gray-800 whitespace-pre-wrap">
              {currentNode.content}
            </div>
            
            {/* 戦略メモ（トップの意図） */}
            {currentNode.strategy_note && (
              <div className="mt-4 p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
                <div className="flex items-start gap-2">
                  <span className="text-purple-600 font-bold text-sm">💡 トップの意図:</span>
                  <p className="text-sm text-purple-700">{currentNode.strategy_note}</p>
                </div>
              </div>
            )}
            
            {/* 次の一手ヒント */}
            {currentNode.next_move_hint && (
              <div className="mt-2 p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-start gap-2">
                  <span className="text-green-600 font-bold text-sm">➡️ 次の一手:</span>
                  <p className="text-sm text-green-700">{currentNode.next_move_hint}</p>
                </div>
              </div>
            )}
          </div>

          {/* ジャンプしたコンテンツ（お守りパネルから） */}
          {jumpedContent && (
            <div className="mb-6 p-4 bg-yellow-50 rounded-lg border-2 border-yellow-300">
              <h4 className="font-bold text-yellow-800 mb-2">🛡️ お守りトーク:</h4>
              <p className="text-yellow-900 whitespace-pre-wrap">{jumpedContent}</p>
              <button
                onClick={() => setJumpedContent(null)}
                className="mt-2 px-3 py-1 bg-yellow-200 hover:bg-yellow-300 rounded text-sm font-medium transition-colors"
              >
                ✖️ 閉じる
              </button>
            </div>
          )}

          {/* 選択肢 */}
          {currentNode.options && currentNode.options.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-600 mb-3">
                👇 顧客の反応を選択してください:
              </p>
              {currentNode.options.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleOptionClick(option)}
                  className="w-full p-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg font-medium text-left transition-all duration-200 shadow-md hover:shadow-xl transform hover:-translate-y-1"
                >
                  <span className="text-lg">{option.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* 終了ノードの場合 */}
          {currentNode.type === "end" && (
            <div className="text-center">
              <button
                onClick={handleReset}
                className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors shadow-md"
              >
                🔄 最初からやり直す
              </button>
            </div>
          )}
        </div>

          {/* フッター */}
          <div className="text-center text-sm text-gray-500">
            <p>通話中にこの画面を見ながら、顧客の反応に合わせてトークを進めてください。</p>
          </div>
        </div>
      </div>

      {/* コマンドパネル（お守り） */}
      {showCommandPanel && (
        <CommandPanel onJumpToResponse={handleJumpToResponse} />
      )}

      {/* NextMoveHint（勝ちパターンへの誘導） */}
      {nextMoveHint && (
        <NextMoveHint
          hint={nextMoveHint}
          onAccept={handleAcceptHint}
          onDismiss={handleDismissHint}
        />
      )}
    </div>
  );
}
