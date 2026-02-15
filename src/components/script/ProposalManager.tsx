"use client";

import { useState } from "react";
import type { ScriptProposal, ScriptNode } from "@/src/types/script";

interface ProposalManagerProps {
  proposals: ScriptProposal[];
  onApprove: (proposal: ScriptProposal) => void;
  onReject: (proposalId: string) => void;
}

export default function ProposalManager({
  proposals,
  onApprove,
  onReject,
}: ProposalManagerProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (proposals.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-gray-500">現在、AI提案はありません</p>
        <p className="text-sm text-gray-400 mt-2">
          分析結果から新しい切り返し案が抽出されると、ここに表示されます
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">
        🤖 AI提案（{proposals.length}件）
      </h2>

      {proposals.map((proposal) => (
        <div
          key={proposal.id}
          className="bg-white rounded-lg shadow-lg border-2 border-purple-200 overflow-hidden"
        >
          {/* ヘッダー */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 border-b border-purple-200">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-800">
                  {proposal.title}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {proposal.description}
                </p>
              </div>
              <button
                onClick={() =>
                  setExpandedId(expandedId === proposal.id ? null : proposal.id)
                }
                className="ml-4 px-3 py-2 bg-white hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors"
              >
                {expandedId === proposal.id ? "▲ 閉じる" : "▼ 詳細"}
              </button>
            </div>
          </div>

          {/* 詳細（展開時） */}
          {expandedId === proposal.id && (
            <div className="p-4 bg-gray-50">
              <div className="bg-white rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-gray-700 mb-2">
                  提案されるノード:
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600">
                      タイプ:
                    </span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                      {proposal.proposedNode.type}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600 block mb-1">
                      コンテンツ:
                    </span>
                    <div className="bg-gray-50 p-3 rounded border border-gray-200 text-sm whitespace-pre-wrap">
                      {proposal.proposedNode.content}
                    </div>
                  </div>
                  {proposal.proposedNode.options &&
                    proposal.proposedNode.options.length > 0 && (
                      <div>
                        <span className="text-sm font-medium text-gray-600 block mb-1">
                          選択肢:
                        </span>
                        <div className="space-y-1">
                          {proposal.proposedNode.options.map((option) => (
                            <div
                              key={option.id}
                              className="bg-gray-50 p-2 rounded border border-gray-200 text-sm"
                            >
                              {option.label} → {option.nextNodeId}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              </div>

              {/* アクションボタン */}
              <div className="flex gap-3">
                <button
                  onClick={() => onApprove(proposal)}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg font-medium transition-all shadow-md"
                >
                  ✅ 承認して追加
                </button>
                <button
                  onClick={() => onReject(proposal.id)}
                  className="px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
                >
                  ❌ 却下
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
