"use server";

import { db } from "@/src/lib/db";
import { revalidatePath } from "next/cache";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { readFile } from "fs/promises";
import path from "path";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "");

// 音声・指導ペアをマルチモーダル分析
export async function analyzeFeedbackPair(caseId: string, feedbackId: string) {
  try {
    console.log("🔍 分析開始:", { caseId, feedbackId });

    // 課題音声と指導音声のデータを取得
    const caseResult = await db.execute({
      sql: "SELECT * FROM recordings WHERE id = ?",
      args: [caseId],
    });

    const feedbackResult = await db.execute({
      sql: "SELECT * FROM recordings WHERE id = ?",
      args: [feedbackId],
    });

    if (caseResult.rows.length === 0 || feedbackResult.rows.length === 0) {
      return { success: false, error: "録音データが見つかりません" };
    }

    const caseRecording = caseResult.rows[0];
    const feedbackRecording = feedbackResult.rows[0];

    // 文字起こしテキストを取得
    const caseTranscriptResult = await db.execute({
      sql: "SELECT content FROM transcripts WHERE recording_id = ?",
      args: [caseId],
    });

    const feedbackTranscriptResult = await db.execute({
      sql: "SELECT content FROM transcripts WHERE recording_id = ?",
      args: [feedbackId],
    });

    const caseTranscript =
      caseTranscriptResult.rows.length > 0
        ? (caseTranscriptResult.rows[0].content as string)
        : "";
    const feedbackTranscript =
      feedbackTranscriptResult.rows.length > 0
        ? (feedbackTranscriptResult.rows[0].content as string)
        : "";

    // 音声ファイルのパスを取得
    const caseAudioPath = path.join(
      process.cwd(),
      "public",
      caseRecording.audio_url as string
    );
    const feedbackAudioPath = path.join(
      process.cwd(),
      "public",
      feedbackRecording.audio_url as string
    );

    console.log("📁 音声ファイルパス:", { caseAudioPath, feedbackAudioPath });

    // 音声ファイルを読み込む
    const caseAudioBuffer = await readFile(caseAudioPath);
    const feedbackAudioBuffer = await readFile(feedbackAudioPath);

    // Gemini 1.5 Proモデルを使用
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // マルチモーダルプロンプト
    const prompt = `
あなたはテレアポ営業のトレーニング専門家です。以下の2つの音声を分析してください：

【課題音声（新人）】
文字起こし: ${caseTranscript}

【指導音声（上司/マネージャー）】
文字起こし: ${feedbackTranscript}

## 分析タスク
1. **上司が指摘している「正解の論理」を抽出**
   - 新人のどこが問題だったのか
   - 正しいアプローチは何か
   - なぜそれが正解なのか（理由・根拠）

2. **状況タグの付与**
   - 業種（例: IT、不動産、製造業など）
   - 顧客の反応（例: 興味あり、拒否、時間がない）
   - トークのフェーズ（例: アプローチ、ヒアリング、クロージング）

3. **学習用ナレッジとしての構造化**
   - このペアから学べる「再現可能なノウハウ」を箇条書きで整理
   - 次回のトークスクリプト提案に活かせる具体的なアドバイス

## 出力形式（JSON）
{
  "analysis_summary": "分析サマリー（200字程度）",
  "problem_points": ["問題点1", "問題点2", ...],
  "correct_approach": ["正解アプローチ1", "正解アプローチ2", ...],
  "reasoning": ["理由・根拠1", "理由・根拠2", ...],
  "tags": {
    "industry": "業種名",
    "customer_reaction": "顧客反応",
    "phase": "トークフェーズ"
  },
  "actionable_knowledge": ["ノウハウ1", "ノウハウ2", ...],
  "script_suggestion": "次回のトークスクリプト提案"
}
`;

    // Gemini APIに送信（音声ファイルは直接送らず、文字起こしテキストで分析）
    console.log("🤖 Gemini APIで分析中...");
    const result = await model.generateContent(prompt);
    const response = result.response;
    const analysisText = response.text();

    console.log("✅ 分析完了");

    // JSONを抽出（マークダウンのコードブロックを除去）
    let analysisData: any;
    try {
      const jsonMatch = analysisText.match(/```json\n([\s\S]*?)\n```/) || 
                       analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonText = jsonMatch[1] || jsonMatch[0];
        analysisData = JSON.parse(jsonText);
      } else {
        analysisData = { raw_analysis: analysisText };
      }
    } catch (e) {
      analysisData = { raw_analysis: analysisText };
    }

    // タグを抽出
    const tags = analysisData.tags
      ? `${analysisData.tags.industry || ""},${analysisData.tags.customer_reaction || ""},${analysisData.tags.phase || ""}`
      : "";

    // 分析結果をDBに保存
    const analysisId = `analysis_${Date.now()}`;
    const now = Date.now();

    await db.execute({
      sql: `INSERT INTO analysis_results (id, case_recording_id, feedback_recording_id, analysis_data, tags, is_knowledge_base, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        analysisId,
        caseId,
        feedbackId,
        JSON.stringify(analysisData),
        tags,
        1,
        now,
      ],
    });

    console.log("✅ 分析結果をデータベースに保存完了");

    revalidatePath("/recordings");

    return {
      success: true,
      analysisId,
      data: analysisData,
    };
  } catch (error) {
    console.error("❌ 分析エラー:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "不明なエラー",
    };
  }
}

// 分析結果を取得
export async function getAnalysisResult(analysisId: string) {
  try {
    const result = await db.execute({
      sql: "SELECT * FROM analysis_results WHERE id = ?",
      args: [analysisId],
    });

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id as string,
      case_recording_id: row.case_recording_id as string,
      feedback_recording_id: row.feedback_recording_id as string,
      analysis_data: JSON.parse(row.analysis_data as string),
      tags: row.tags as string,
      is_knowledge_base: row.is_knowledge_base as number,
      created_at: row.created_at as number,
    };
  } catch (error) {
    console.error("❌ 分析結果取得エラー:", error);
    return null;
  }
}

// 特定の課題音声に対する分析結果を取得
export async function getAnalysisByRecordingId(recordingId: string) {
  try {
    const result = await db.execute({
      sql: `SELECT * FROM analysis_results 
            WHERE case_recording_id = ? OR feedback_recording_id = ?
            ORDER BY created_at DESC`,
      args: [recordingId, recordingId],
    });

    return result.rows.map((row) => ({
      id: row.id as string,
      case_recording_id: row.case_recording_id as string,
      feedback_recording_id: row.feedback_recording_id as string,
      analysis_data: JSON.parse(row.analysis_data as string),
      tags: row.tags as string,
      is_knowledge_base: row.is_knowledge_base as number,
      created_at: row.created_at as number,
    }));
  } catch (error) {
    console.error("❌ 分析結果取得エラー:", error);
    return [];
  }
}

// 分析結果からスクリプト提案を生成
export async function generateScriptProposalFromAnalysis(analysisId: string) {
  try {
    const analysis = await getAnalysisResult(analysisId);
    if (!analysis) {
      return { success: false, error: "分析結果が見つかりません" };
    }

    const analysisData = analysis.analysis_data;

    // 分析結果から提案ノードを生成
    const proposalNode = {
      id: `node_proposal_${Date.now()}`,
      type: "question" as const,
      content: analysisData.script_suggestion || "提案されたトーク内容",
      options: [
        {
          id: `opt_accept_${Date.now()}`,
          label: "✅ 興味あり",
          nextNodeId: "node_demo", // 既存のノードに接続（要調整）
        },
        {
          id: `opt_reject_${Date.now()}`,
          label: "❌ 不要",
          nextNodeId: "node_reject", // 既存のノードに接続（要調整）
        },
      ],
    };

    return {
      success: true,
      proposal: {
        id: `proposal_${Date.now()}`,
        title: "AI分析からの提案",
        description: analysisData.analysis_summary || "分析結果に基づく新しいトーク案",
        proposedNode: proposalNode,
        sourceAnalysisId: analysisId,
      },
    };
  } catch (error) {
    console.error("❌ 提案生成エラー:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "不明なエラー",
    };
  }
}
