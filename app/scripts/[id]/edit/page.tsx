"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getScriptById, updateScript } from "@/src/actions/script-actions";
import VisualScriptEditor from "@/src/components/script/VisualScriptEditor";
import ProposalManager from "@/src/components/script/ProposalManager";
import type { ParsedScript, ScriptFlowData, ScriptProposal } from "@/src/types/script";

export default function ScriptEditPage() {
  const params = useParams();
  const router = useRouter();
  const scriptId = params.id as string;

  const [script, setScript] = useState<ParsedScript | null>(null);
  const [loading, setLoading] = useState(true);
  const [proposals, setProposals] = useState<ScriptProposal[]>([]);
  const [activeTab, setActiveTab] = useState<"editor" | "proposals">("editor");

  useEffect(() => {
    const fetchScript = async () => {
      const data = await getScriptById(scriptId);
      if (data) {
        setScript(data);
      }
      setLoading(false);
    };

    fetchScript();

    // ダミーの提案データ（本来はanalysis_resultsから取得）
    setProposals([
      {
        id: "proposal_1",
        title: "課題音声分析からの提案",
        description: "新人が断られやすいポイントに対する切り返し案",
        proposedNode: {
          id: "node_new_objection",
          type: "question",
          content:
            "確かに、今すぐご検討というのは難しいかもしれませんね。\n\nただ、他社様でも最初は「検討の必要性を感じていない」という状態から、実際に導入いただいたケースが多くございます。\n\nもし、3分だけお時間をいただけるなら、なぜ他社様が導入を決めたのか、その理由だけでもお話しさせていただけませんか？",
          options: [
            {
              id: "opt_new_1",
              label: "✅ 3分なら聞いてもいい",
              nextNodeId: "node_demo",
            },
            {
              id: "opt_new_2",
              label: "❌ やはり不要",
              nextNodeId: "node_reject",
            },
          ],
        },
        sourceAnalysisId: "analysis_123",
      },
    ]);
  }, [scriptId]);

  const handleSave = async (flowData: ScriptFlowData) => {
    if (!script) return;

    const result = await updateScript(scriptId, script.title, flowData);
    if (result.success) {
      alert("✅ スクリプトを保存しました！");
      router.push("/scripts");
    } else {
      alert(`❌ エラー: ${result.error}`);
    }
  };

  const handleApproveProposal = (proposal: ScriptProposal) => {
    if (!script) return;

    // 提案されたノードをスクリプトに追加
    const updatedFlowData: ScriptFlowData = {
      ...script.flowData,
      nodes: [...script.flowData.nodes, proposal.proposedNode],
    };

    setScript({
      ...script,
      flowData: updatedFlowData,
    });

    // 提案リストから削除
    setProposals(proposals.filter((p) => p.id !== proposal.id));

    alert("✅ 提案を承認しました！ビジュアルエディタで確認してください。");
    setActiveTab("editor");
  };

  const handleRejectProposal = (proposalId: string) => {
    setProposals(proposals.filter((p) => p.id !== proposalId));
    alert("❌ 提案を却下しました。");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  if (!script) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">スクリプトが見つかりません</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              ✏️ スクリプト編集
            </h1>
            <p className="text-gray-600 text-sm mt-1">{script.title}</p>
          </div>
          <button
            onClick={() => router.push("/scripts")}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors"
          >
            ← 一覧に戻る
          </button>
        </div>
      </div>

      {/* タブナビゲーション */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab("editor")}
              className={`px-6 py-3 font-medium border-b-2 transition-colors ${
                activeTab === "editor"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              🎨 ビジュアルエディタ
            </button>
            <button
              onClick={() => setActiveTab("proposals")}
              className={`px-6 py-3 font-medium border-b-2 transition-colors relative ${
                activeTab === "proposals"
                  ? "border-purple-600 text-purple-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              🤖 AI提案
              {proposals.length > 0 && (
                <span className="absolute -top-1 -right-1 px-2 py-1 bg-red-500 text-white text-xs rounded-full">
                  {proposals.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* コンテンツ */}
      <div className="max-w-7xl mx-auto p-6">
        {activeTab === "editor" && (
          <VisualScriptEditor flowData={script.flowData} onSave={handleSave} />
        )}

        {activeTab === "proposals" && (
          <ProposalManager
            proposals={proposals}
            onApprove={handleApproveProposal}
            onReject={handleRejectProposal}
          />
        )}
      </div>
    </div>
  );
}
