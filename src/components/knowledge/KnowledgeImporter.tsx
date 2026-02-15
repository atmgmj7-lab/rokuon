"use client";

import { useState } from "react";
import { importStaticKnowledge } from "@/src/actions/knowledge-actions";

export default function KnowledgeImporter() {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  // サンプルデータをインポート
  const handleImportSample = async () => {
    setImporting(true);
    setResult(null);

    const sampleData = [
      // 断り文句カテゴリ
      {
        category: "objection" as const,
        title: "「忙しい」への切り返し",
        content:
          "承知いたしました。お忙しいところ失礼いたしました。\n\nただ、1分だけお時間をいただければ、なぜ今お電話したのか、その理由だけでもお伝えさせていただけませんか？\n\nもし興味がなければ、すぐに切っていただいて構いません。",
        tags: "断り,時間がない,アプローチ",
        logic_explanation:
          "「1分だけ」という具体的な時間を提示することで、心理的ハードルを下げる。また、「切っていただいて構いません」と逃げ道を作ることで、聞く姿勢を引き出す。",
        next_move_hint:
          "1分経過後、「実は〇〇という課題をお持ちではありませんか？」と具体的な課題提起に移行する。",
      },
      {
        category: "objection" as const,
        title: "「必要ない」への切り返し",
        content:
          "おっしゃる通りですね。必要性を感じていらっしゃらないのであれば、無理にお時間を取らせるつもりはございません。\n\nただ、他社様でも最初は同じようにおっしゃっていた企業様が、実際に導入後「もっと早く知りたかった」と言っていただけるケースが多いんです。\n\n3分だけ、なぜそう言っていただけたのか、その理由だけでもお話しさせていただけませんか？",
        tags: "断り,必要ない,興味なし",
        logic_explanation:
          "相手の意見を一度肯定し、その上で「他社の成功事例」という社会的証明を使う。「もっと早く知りたかった」というフレーズで、機会損失の恐怖を喚起。",
        next_move_hint:
          "具体的な成功事例を1つ簡潔に紹介し、「御社でも同じような課題はありませんか？」とヒアリングに移行。",
      },
      // 質問集カテゴリ
      {
        category: "question" as const,
        title: "業種確認",
        content: "失礼ですが、御社の事業内容を簡単に教えていただけますでしょうか？",
        tags: "ヒアリング,業種,基本情報",
        logic_explanation:
          "最初の質問として、相手に話させることで警戒心を解く。また、業種を把握することで、後続のトークを最適化できる。",
        next_move_hint:
          "業種が分かったら、「〇〇業界では〜という課題が多いと伺いますが」と業界特有の課題に言及。",
      },
      {
        category: "question" as const,
        title: "意思決定者確認",
        content:
          "ちなみに、〇〇に関する検討や導入のご判断は、どなたがされるのでしょうか？",
        tags: "ヒアリング,意思決定者,キーマン",
        logic_explanation:
          "キーマンを早期に特定することで、無駄な商談を避けられる。また、相手が担当者の場合は、上司への報告方法をサポートできる。",
        next_move_hint:
          "社長が意思決定者の場合は、経営視点の価値提案に切り替える。担当者の場合は、上司説得用の資料提供を提案。",
      },
      // ヒアリング項目カテゴリ
      {
        category: "hearing" as const,
        title: "現状のツール・システム",
        content:
          "現在、〇〇の管理にはどのようなツールやシステムをお使いでしょうか？",
        tags: "ヒアリング,現状把握,競合",
        logic_explanation:
          "現状を把握することで、乗り換えの提案がしやすくなる。また、不満点を引き出すきっかけになる。",
        next_move_hint:
          "「そのツールで何か課題や不満な点はありますか？」と深掘りし、課題を顕在化させる。",
      },
      {
        category: "hearing" as const,
        title: "予算感確認",
        content:
          "もし導入をご検討される場合、どの程度のご予算感をお考えでしょうか？",
        tags: "ヒアリング,予算,価格",
        logic_explanation:
          "予算感を早期に把握することで、提案内容を最適化できる。また、予算がない場合は早めに見切りをつけられる。",
        next_move_hint:
          "予算が厳しい場合は、ROI（投資対効果）の具体例を提示し、費用対効果で納得感を作る。",
      },
      // さしどころトークカテゴリ
      {
        category: "key_talk" as const,
        title: "競合との差別化トーク",
        content:
          "他社様と比較されることも多いのですが、弊社が選ばれる理由は大きく3つございます。\n\n1つ目は、導入後のサポート体制です。専任の担当者が付き、運用が軌道に乗るまで伴走します。\n\n2つ目は、カスタマイズ性です。御社の業務フローに合わせて柔軟に調整できます。\n\n3つ目は、コストパフォーマンスです。同等の機能を持つ他社製品と比べて、約30%ほどコストを抑えられます。\n\nこの3点が、多くの企業様に選ばれている理由です。",
        tags: "さしどころ,差別化,強み",
        logic_explanation:
          "具体的な数字（3つ、30%）を使うことで説得力を高める。また、「サポート」「カスタマイズ」「コスパ」という3つの軸で、多様なニーズに対応。",
        success_factors: "サポート重視・柔軟性・コスト削減",
        next_move_hint:
          "「この3点の中で、御社が最も重視されるのはどれでしょうか？」と優先順位を確認し、深掘り。",
      },
      {
        category: "key_talk" as const,
        title: "導入事例トーク",
        content:
          "実は、御社と同じ〇〇業界の△△社様にも導入いただいておりまして、導入後3ヶ月で業務時間が40%削減されたという実績がございます。\n\n最初は「本当に効果があるのか」と半信半疑だったそうなのですが、実際に使ってみたら「もっと早く導入すれば良かった」とおっしゃっていただけました。\n\n△△社様の事例を簡単にご紹介させていただけますでしょうか？",
        tags: "さしどころ,事例,社会的証明",
        logic_explanation:
          "同業他社の成功事例は最強の社会的証明。具体的な数字（40%削減）で信憑性を高める。「半信半疑だった」というフレーズで、相手の不安に共感。",
        success_factors: "社会的証明・具体的数値・共感",
        next_move_hint:
          "事例紹介後、「御社でも同じような課題はございませんか？」と自社の課題に引き戻す。",
      },
    ];

    const response = await importStaticKnowledge(sampleData);

    if (response.success) {
      setResult(`✅ ${response.importedCount}件のナレッジをインポートしました！`);
      // ページをリロードして最新データを表示
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } else {
      setResult(`❌ エラー: ${response.error}`);
    }

    setImporting(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">
        📥 ナレッジインポート
      </h2>
      <p className="text-gray-600 mb-6">
        Figmaの文面データや既存のトーク集を一括でインポートできます
      </p>

      <div className="flex gap-4">
        <button
          onClick={handleImportSample}
          disabled={importing}
          className={`px-6 py-3 rounded-lg font-medium transition-all shadow-md ${
            importing
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
          }`}
        >
          {importing ? "インポート中..." : "🎯 サンプルナレッジをインポート"}
        </button>
      </div>

      {result && (
        <div
          className={`mt-4 p-4 rounded-lg ${
            result.includes("✅")
              ? "bg-green-50 text-green-800"
              : "bg-red-50 text-red-800"
          }`}
        >
          {result}
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-700">
          💡 <strong>開発者向け:</strong> カスタムデータをインポートするには、
          <code className="bg-blue-100 px-2 py-1 rounded mx-1">
            importStaticKnowledge
          </code>
          関数を使用してください。
        </p>
      </div>
    </div>
  );
}
