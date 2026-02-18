"use server";

import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY ?? "");

/** formatCallTranscript用: startTime/endTimeを必須としたJSONスキーマ */
const transcriptResponseSchema = {
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      type: { type: SchemaType.STRING, description: "paragraph" },
      text: { type: SchemaType.STRING, description: "補正後のテキスト" },
      startTime: { type: SchemaType.NUMBER, description: "開始秒数（必須）" },
      endTime: { type: SchemaType.NUMBER, description: "終了秒数（必須）" },
    },
    required: ["type", "text", "startTime", "endTime"],
  },
};

/**
 * AIレスポンスからマークダウンのコードブロックを除去し、JSON文字列を抽出する。
 * パース成功時は { parsed, raw }、失敗時は null を返す。
 * 失敗時は console.error で詳細を出力する。
 */
function parseJsonRobust(
  responseText: string,
  context: { fn: string }
): { parsed: unknown[]; raw: string } | null {
  if (!responseText?.trim()) {
    console.error(`[${context.fn}] レスポンスが空です`);
    return null;
  }

  let cleaned = responseText.trim();

  // マークダウンのコードブロックを除去: ```json ... ``` または ``` ... ```
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  }

  // 前後に余計な文字が残っている場合、配列 [ ～ ] を抽出
  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    cleaned = arrayMatch[0];
  }

  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) {
      return { parsed, raw: JSON.stringify(parsed) };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("❌ [DEBUG] JSONパースエラー詳細:", {
      fn: context.fn,
      message,
      rawPreview: responseText.slice(0, 500),
      cleanedPreview: cleaned.slice(0, 500),
    });
    return null;
  }

  console.error(`[${context.fn}] パース結果が配列ではありません`);
  return null;
}

/**
 * 404を回避するため、複数の1.5系モデルを順番に試す自動ルーター
 * @param prompt - プロンプト文字列
 * @param responseSchema - オプション。JSON出力のスキーマ（startTime/endTime必須化など）
 */
async function generateWithFallback(
  prompt: string,
  responseSchema?: { type: string; items: object }
): Promise<string> {
  const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;

  try {
    console.log("🔍 [DEBUG] APIキーの有効性と利用可能モデルを調査中...");
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    const data = (await response.json()) as {
      error?: { message?: string; code?: number };
      models?: { name: string }[];
    };

    if (data.error) {
      console.error("❌ [DEBUG] APIキー自体が無効、または権限エラー:", data.error);
    } else if (data.models && data.models.length > 0) {
      const modelNames = data.models.map((m) => m.name).join(", ");
      console.log("✅ [DEBUG] このAPIキーで利用可能なモデル一覧:\n", modelNames);
    } else {
      console.warn("⚠️ [DEBUG] 利用可能なモデルが0件でした");
    }
  } catch (e) {
    console.error("❌ [DEBUG] モデル一覧の取得に失敗しました:", e);
  }

  // 最新の環境で稼働しているSaaS向けのモデルフォールバックリスト（2.0 / 3.0世代）
  const AVAILABLE_MODELS = [
    "gemini-2.0-flash",
    "gemini-2.5-flash",
    "gemini-3.0-flash",
    "gemini-2.0-flash-lite-preview-02-05",
    "gemini-2.0-pro-exp-02-05",
  ];

  const RATE_LIMIT_DELAY_MS = 32_000; // 429時は約30秒待ってから再試行

  for (const modelName of AVAILABLE_MODELS) {
    for (let attempt = 0; attempt <= 1; attempt++) {
      try {
        if (attempt === 1) {
          console.log(`⏳ [DEBUG] レート制限のため ${RATE_LIMIT_DELAY_MS / 1000} 秒待機して再試行します...`);
          await new Promise((r) => setTimeout(r, RATE_LIMIT_DELAY_MS));
        }
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: "application/json",
            ...(responseSchema && { responseSchema }),
          },
        });
        const result = await model.generateContent(prompt);
        console.log(`✅ [DEBUG] モデル ${modelName} で生成に成功しました！`);
        return result.response.text();
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        const is429 = message.includes("429") || message.includes("Too Many Requests") || message.includes("quota");
        const is404 = message.includes("404");

        if (is429) {
          if (attempt === 0) {
            console.warn(`⚠️ [DEBUG] モデル ${modelName} がレート制限(429)でした。待機後に再試行します...`);
            continue;
          }
          console.warn(`⚠️ [DEBUG] モデル ${modelName} がレート制限のためスキップし、次のモデルを試します...`);
          break;
        }
        if (is404) {
          console.warn(`⚠️ [DEBUG] モデル ${modelName} が404でした。次を試します...`);
          break;
        }
        throw error;
      }
    }
  }
  throw new Error(
    "利用可能なGeminiモデルが一つも応答しませんでした。レート制限の場合はしばらく時間をおくか、Google AI Studioのプラン・請求を確認してください。"
  );
}

/**
 * A. 商談テキストの整形（誤字補正＋段落分け）
 * Whisperのベタ書きテキストを営業/顧客の対話JSON配列に変換
 */
export async function formatCallTranscript(rawText: string) {
  try {
    if (!rawText?.trim()) {
      return { success: true, json: "[]" };
    }

    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      return { success: false, error: "GOOGLE_AI_API_KEYが設定されていません", json: rawText };
    }

    const prompt = `あなたは世界最高峰のインサイドセールスマネージャー兼、プロの文字起こし校正者です。
入力テキストはAIが書き起こした商談のベタ書きテキストですが、相手（顧客）の声が入っていない片側録音の可能性が高いです。また、AIの聞き間違い（例：『dove Thema』→『お電話』『恐れ入ります』等）が多数含まれています。

【必須：タイムスタンプの出力】
入力テキストには必ず [0.0s - 4.5s] のようなタイムスタンプが含まれています。出力するJSONの各段落オブジェクトには、その段落が該当する開始時間（startTime）と終了時間（endTime）を**必ず**数値として含めてください。時間タグ自体はテキストから削除してください。startTime/endTimeを省略することは絶対に禁止です。

以下のタスクを実行してください。
1. 【超強力な意訳・補正】: 意味不明な文字列を、営業マンが実際に話したであろう自然な日本語に完璧に書き換えてください。
2. 【読みやすい段落分け】: 無理に話者を分けず、話題の区切りや息継ぎの意味のまとまりごとに分割してください。

【重要：固有名詞の強制補正ルール】
音声認識の仕様上、以下の単語が誤認識されやすいため、文脈から判断して【必ず正しい表記】に補正してください。
- 『スー株式会社』『スーン株式会社』 👉 『Sooon株式会社』
- 『ノーン』 👉 『ローン』
- 『従中』 👉 『受注』
このルールは絶対です。文脈に合わせて自然な日本語に意訳しつつ、これらのキーワードは正確に反映させてください。

【重要：段落分けの厳格なルール】
出力するJSON配列は、長文の塊にしないでください。
必ず、句点（。）や疑問符（？）、または意味の明確な切れ目が来るたびに、新しいオブジェクトとして配列を分割してください。
1つの段落（textの中身）は、原則として『1文〜長くても2文程度』に収めること。
各オブジェクトには startTime（秒）と endTime（秒）を必ず含めてください。タイムスタンプから推測できない場合は、前の段落の終了時刻を次の開始時刻として連続させてください。startTime/endTimeが欠けているオブジェクトは絶対に出力しないでください。

出力例:
[
  { "type": "paragraph", "text": "Sooon株式会社の鈴木と申しまして。", "startTime": 0.0, "endTime": 4.5 },
  { "type": "paragraph", "text": "課長の坂井さん宛てにお電話だったんですけど、お世話になっております。", "startTime": 4.5, "endTime": 8.2 },
  { "type": "paragraph", "text": "今事務所にいらっしゃいますか？", "startTime": 8.2, "endTime": 10.0 }
]

## 入力テキスト
${rawText}`;

    console.log("🚀 [DEBUG] Gemini API呼び出し開始（startTime/endTime必須スキーマ）");
    const responseText = await generateWithFallback(prompt, transcriptResponseSchema);
    console.log("📦 [DEBUG] Gemini生レスポンス:", responseText?.slice(0, 500));

    const parsed = parseJsonRobust(responseText, { fn: "formatCallTranscript" });

    if (parsed) {
      return { success: true, json: parsed.raw };
    }

    const errorMessage = "JSONパース失敗（Geminiレスポンスの形式が不正）";
    console.error("❌ [DEBUG] formatCallTranscript:", errorMessage);
    const fallbackArray = [
      { type: "paragraph" as const, text: `⚠️ 【AI処理エラー】原因: ${errorMessage}`, startTime: 0, endTime: 0 },
      { type: "paragraph" as const, text: "以下のテキストは未補正の生データです：", startTime: 0, endTime: 0 },
      { type: "paragraph" as const, text: rawText, startTime: 0, endTime: 0 },
    ];
    return { success: true, json: JSON.stringify(fallbackArray) };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ [DEBUG] formatCallTranscript: Gemini API通信エラー:", errorMessage);
    const fallbackArray = [
      { type: "paragraph" as const, text: `⚠️ 【AI処理エラー】原因: ${errorMessage}`, startTime: 0, endTime: 0 },
      { type: "paragraph" as const, text: "以下のテキストは未補正の生データです：", startTime: 0, endTime: 0 },
      { type: "paragraph" as const, text: rawText, startTime: 0, endTime: 0 },
    ];
    return { success: true, json: JSON.stringify(fallbackArray) };
  }
}

/**
 * B. 指導音声のインライン結合
 * 元の商談JSONとマネージャー指導テキストをマージ。
 * 重複部分を排除し、アドバイスのみを適切な位置に挿入する。
 */
export async function mergeFeedbackIntoTranscript(
  originalFormattedJson: string,
  feedbackRawText: string
) {
  try {
    if (!originalFormattedJson?.trim()) {
      return { success: true, json: originalFormattedJson };
    }
    if (!feedbackRawText?.trim()) {
      return { success: true, json: originalFormattedJson };
    }

    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      return { success: false, error: "GOOGLE_AI_API_KEYが設定されていません", json: originalFormattedJson };
    }

    const prompt = `入力1は商談テキスト（JSON配列）、入力2は指導音声テキストです。
入力2には、マネージャーが商談を再生しながら聞いている『元の商談の音声（重複部分）』と、『具体的なアドバイス』が混ざっています。
タスク: 入力2から【元の音声の重複部分を完全に削除】し、【マネージャーの具体的なアドバイスのみ】を抽出してください。そして、その純粋なアドバイスを入力1の適切な位置に挿入してください。
入力1のparagraphに startTime/endTime が含まれている場合は、そのまま維持してください。feedback には startTime/endTime は不要です。

【重要：段落分けの厳格なルール】
paragraph の text は、句点（。）や疑問符（？）で区切り、1文〜長くても2文程度に分割すること。
長文の塊にせず、読みやすい粒度で配列を分割すること。
出力例:
[..., { "type": "paragraph", "text": "恐れ入ります。", "startTime": 0.0, "endTime": 2.0 }, { "type": "paragraph", "text": "今事務所にいらっしゃいますか？", "startTime": 2.0, "endTime": 5.0 }, { "type": "feedback", "text": "ここは〇〇と深掘りすべきです" }, ...]

## 入力1（元の商談JSON）
${originalFormattedJson}

## 入力2（マネージャー指導音声テキスト）
${feedbackRawText}`;

    console.log("🚀 [DEBUG] mergeFeedbackIntoTranscript: Gemini API呼び出し開始");
    const responseText = await generateWithFallback(prompt);
    console.log("📦 [DEBUG] mergeFeedbackIntoTranscript: Gemini生レスポンス:", responseText?.slice(0, 500));

    const parsed = parseJsonRobust(responseText, { fn: "mergeFeedbackIntoTranscript" });

    if (parsed) {
      return { success: true, json: parsed.raw };
    }

    const errorMessage = "JSONパース失敗（Geminiレスポンスの形式が不正）";
    console.error("❌ [DEBUG] mergeFeedbackIntoTranscript:", errorMessage);
    let fallbackArray: { type: "paragraph" | "feedback"; text: string }[];
    try {
      const original = JSON.parse(originalFormattedJson);
      fallbackArray = Array.isArray(original)
        ? [
            { type: "feedback" as const, text: `⚠️ 【AIマージエラー】原因: ${errorMessage}` },
            ...original,
          ]
        : [
            { type: "feedback" as const, text: `⚠️ 【AIマージエラー】原因: ${errorMessage}` },
            { type: "paragraph" as const, text: "以下はマージ前の元データです：" },
            { type: "paragraph" as const, text: originalFormattedJson.slice(0, 2000) },
          ];
    } catch {
      fallbackArray = [
        { type: "feedback" as const, text: `⚠️ 【AIマージエラー】原因: ${errorMessage}` },
        { type: "paragraph" as const, text: "以下はマージ前の元データです：" },
        { type: "paragraph" as const, text: originalFormattedJson.slice(0, 2000) },
      ];
    }
    return { success: true, json: JSON.stringify(fallbackArray) };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ [DEBUG] mergeFeedbackIntoTranscript: Gemini API通信エラー:", errorMessage);
    let fallbackArray: { type: "paragraph" | "feedback"; text: string }[];
    try {
      const original = JSON.parse(originalFormattedJson);
      fallbackArray = Array.isArray(original)
        ? [
            { type: "feedback" as const, text: `⚠️ 【AIマージエラー】原因: ${errorMessage}` },
            ...original,
          ]
        : [
            { type: "feedback" as const, text: `⚠️ 【AIマージエラー】原因: ${errorMessage}` },
            { type: "paragraph" as const, text: "以下はマージ前の元データです：" },
            { type: "paragraph" as const, text: originalFormattedJson.slice(0, 2000) },
          ];
    } catch {
      fallbackArray = [
        { type: "feedback" as const, text: `⚠️ 【AIマージエラー】原因: ${errorMessage}` },
        { type: "paragraph" as const, text: "以下はマージ前の元データです：" },
        { type: "paragraph" as const, text: originalFormattedJson.slice(0, 2000) },
      ];
    }
    return { success: true, json: JSON.stringify(fallbackArray) };
  }
}
