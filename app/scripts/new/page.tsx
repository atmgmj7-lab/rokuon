import { createScript } from "@/src/actions/script-actions";
import { redirect } from "next/navigation";
import Link from "next/link";

// サンプルスクリプトを作成するServer Action
async function createSampleScript() {
  "use server";

  const sampleFlowData = {
    startNodeId: "node1",
    nodes: [
      {
        id: "node1",
        type: "message" as const,
        content:
          "お世話になっております。〇〇株式会社の△△と申します。\n\n本日は、貴社の業務効率化についてご提案がございまして、お電話させていただきました。\n\n今、2-3分ほどお時間よろしいでしょうか？",
        options: [
          {
            id: "opt1",
            label: "✅ はい、大丈夫です",
            nextNodeId: "node2",
          },
          {
            id: "opt2",
            label: "❌ 今は忙しい",
            nextNodeId: "node_busy",
          },
        ],
      },
      {
        id: "node2",
        type: "question" as const,
        content:
          "ありがとうございます。\n\n現在、貴社では営業活動の管理にどのようなツールをお使いでしょうか？\n\n例えば、エクセルやスプレッドシート、それとも専用のCRMシステムなどでしょうか？",
        options: [
          {
            id: "opt3",
            label: "📊 エクセル・スプレッドシート",
            nextNodeId: "node_excel",
          },
          {
            id: "opt4",
            label: "💼 CRMシステム使用中",
            nextNodeId: "node_crm",
          },
          {
            id: "opt5",
            label: "❓ 特に管理していない",
            nextNodeId: "node_none",
          },
        ],
      },
      {
        id: "node_excel",
        type: "message" as const,
        content:
          "なるほど、エクセルをお使いなのですね。\n\n実は多くの企業様が同じ状況でして、データの共有や更新に時間がかかったり、最新情報の把握が難しいというお悩みをよく伺います。\n\n弊社のシステムでは、リアルタイムでの情報共有と自動集計により、これらの課題を解決できます。\n\nご興味がございましたら、無料デモをご案内させていただけますがいかがでしょうか？",
        options: [
          {
            id: "opt6",
            label: "✅ デモを見てみたい",
            nextNodeId: "node_demo",
          },
          {
            id: "opt7",
            label: "📧 資料だけ欲しい",
            nextNodeId: "node_material",
          },
          {
            id: "opt8",
            label: "❌ 興味ない",
            nextNodeId: "node_reject",
          },
        ],
      },
      {
        id: "node_crm",
        type: "message" as const,
        content:
          "CRMシステムをお使いなのですね。\n\nちなみに、現在のシステムで何か課題やご不満な点などはございますか？\n\n例えば、操作が複雑、コストが高い、カスタマイズ性が低いなど...",
        options: [
          {
            id: "opt9",
            label: "😤 課題がある",
            nextNodeId: "node_solution",
          },
          {
            id: "opt10",
            label: "😊 特に問題なし",
            nextNodeId: "node_satisfied",
          },
        ],
      },
      {
        id: "node_none",
        type: "message" as const,
        content:
          "そうなのですね。\n\n営業活動の管理を体系化することで、商談の進捗が可視化され、成約率の向上にもつながります。\n\n弊社のシステムは導入も簡単で、初期費用も抑えられますので、まずは無料デモをご覧いただけますでしょうか？",
        options: [
          {
            id: "opt11",
            label: "✅ デモを見てみたい",
            nextNodeId: "node_demo",
          },
          {
            id: "opt12",
            label: "❌ 今は不要",
            nextNodeId: "node_reject",
          },
        ],
      },
      {
        id: "node_busy",
        type: "end" as const,
        content:
          "承知いたしました。お忙しいところ失礼いたしました。\n\nまた改めてご連絡させていただきます。失礼いたします。",
      },
      {
        id: "node_demo",
        type: "end" as const,
        content:
          "ありがとうございます！\n\nそれでは、来週の〇曜日または△曜日で、オンラインデモのお時間をいただけますでしょうか？\n\n30分ほどお時間をいただければと思います。\n\n【次のアクション】\n・日程調整\n・担当者情報を確認\n・カレンダー招待を送信",
      },
      {
        id: "node_material",
        type: "end" as const,
        content:
          "かしこまりました。\n\n資料をお送りさせていただきます。\n\nメールアドレスをお伺いしてもよろしいでしょうか？\n\n【次のアクション】\n・メールアドレスを聞く\n・資料を送付\n・フォローアップ日程を決める",
      },
      {
        id: "node_reject",
        type: "end" as const,
        content:
          "承知いたしました。\n\nお忙しいところお時間をいただきありがとうございました。\n\nまた機会がございましたら、お声がけいただければ幸いです。失礼いたします。",
      },
      {
        id: "node_solution",
        type: "end" as const,
        content:
          "そういった課題を解決できる可能性がございます。\n\n弊社のシステムは、シンプルな操作性とコストパフォーマンスに優れており、多くの企業様にご好評いただいております。\n\n一度、無料デモをご覧いただけますでしょうか？\n\n【次のアクション】\n・デモ日程調整\n・現在の課題をヒアリング",
      },
      {
        id: "node_satisfied",
        type: "end" as const,
        content:
          "それは素晴らしいですね。\n\n今後、何か課題が出てきた際には、ぜひ弊社のサービスもご検討いただければと思います。\n\nお忙しいところありがとうございました。失礼いたします。",
      },
    ],
  };

  const result = await createScript(
    "【サンプル】CRM営業スクリプト",
    sampleFlowData
  );

  if (result.success && result.scriptId) {
    redirect(`/scripts/${result.scriptId}/run`);
  }
}

export default function NewScriptPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            ➕ 新規スクリプト作成
          </h1>
          <p className="text-gray-600 mb-8">
            現在は、サンプルスクリプトを作成してお試しいただけます。
          </p>

          <div className="space-y-6">
            {/* サンプルスクリプト作成 */}
            <div className="border-2 border-blue-200 rounded-lg p-6 bg-blue-50">
              <h2 className="text-xl font-bold text-gray-800 mb-2">
                📋 サンプルスクリプト
              </h2>
              <p className="text-gray-600 mb-4">
                CRM営業のトークスクリプトをすぐに試せます。顧客の反応に応じて分岐するインタラクティブなスクリプトを体験してください。
              </p>
              <ul className="text-sm text-gray-600 mb-4 space-y-1">
                <li>✓ 複数の分岐パターン</li>
                <li>✓ 顧客の反応に応じた対応</li>
                <li>✓ 次のアクション提示</li>
              </ul>
              <form action={createSampleScript}>
                <button
                  type="submit"
                  className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-md"
                >
                  🎯 サンプルスクリプトを作成して実行
                </button>
              </form>
            </div>

            {/* カスタムスクリプト作成（今後実装予定） */}
            <div className="border-2 border-gray-200 rounded-lg p-6 bg-gray-50 opacity-60">
              <h2 className="text-xl font-bold text-gray-800 mb-2">
                ✏️ カスタムスクリプト
              </h2>
              <p className="text-gray-600 mb-4">
                独自のトークスクリプトを作成できます。（今後実装予定）
              </p>
              <button
                disabled
                className="w-full px-6 py-3 bg-gray-400 text-white rounded-lg font-medium cursor-not-allowed"
              >
                Coming Soon...
              </button>
            </div>
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/scripts"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              ← スクリプト一覧に戻る
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
