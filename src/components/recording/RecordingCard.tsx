"use client";

import { useState } from "react";
import FeedbackUploader from "./FeedbackUploader";
import { analyzeFeedbackPair } from "@/src/actions/analysis-actions";

interface Recording {
  id: string;
  title: string;
  description: string;
  audio_url: string;
  duration: number;
  file_size: number;
  recording_type: string;
  parent_id: string | null;
  category_id: string | null;
  created_at: number;
  updated_at: number;
}

interface RecordingCardProps {
  recording: Recording;
  children: Recording[];
}

export default function RecordingCard({ recording, children }: RecordingCardProps) {
  const [showFeedbackUploader, setShowFeedbackUploader] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  // 型バッジ
  const getTypeBadge = (type: string) => {
    switch (type) {
      case "case":
        return (
          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
            📋 課題音声
          </span>
        );
      case "model":
        return (
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
            ⭐ お手本
          </span>
        );
      case "feedback":
        return (
          <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
            🎤 指導音声
          </span>
        );
      default:
        return null;
    }
  };

  // 分析を実行
  const handleAnalyze = async (feedbackId: string) => {
    setAnalyzing(true);
    try {
      const result = await analyzeFeedbackPair(recording.id, feedbackId);
      if (result.success) {
        setAnalysisResult(result.data);
        alert("✅ 分析が完了しました！");
      } else {
        alert(`❌ エラー: ${result.error}`);
      }
    } catch (error) {
      alert(`❌ エラー: ${error instanceof Error ? error.message : "不明なエラー"}`);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      {/* 親録音（課題音声） */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {getTypeBadge(recording.recording_type)}
            <h2 className="text-xl font-bold text-gray-800">{recording.title}</h2>
          </div>
          <p className="text-sm text-gray-500">
            {new Date(recording.created_at).toLocaleString("ja-JP")}
          </p>
        </div>

        {recording.description && (
          <p className="text-gray-600 mb-3">{recording.description}</p>
        )}

        <div className="flex items-center gap-4 mb-3">
          <audio controls src={recording.audio_url} className="flex-1">
            お使いのブラウザは audio 要素をサポートしていません。
          </audio>
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span>⏱️ {Math.floor(recording.duration / 60)}分{recording.duration % 60}秒</span>
          <span>💾 {(recording.file_size / 1024 / 1024).toFixed(2)} MB</span>
        </div>

        {/* 指導音声アップロードボタン */}
        {recording.recording_type === "case" && (
          <div className="mt-4">
            <button
              onClick={() => setShowFeedbackUploader(!showFeedbackUploader)}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors"
            >
              {showFeedbackUploader ? "✖️ キャンセル" : "➕ 指導音声を追加"}
            </button>
          </div>
        )}
      </div>

      {/* 指導音声アップローダー */}
      {showFeedbackUploader && (
        <div className="mb-4">
          <FeedbackUploader
            parentRecordingId={recording.id}
            parentTitle={recording.title}
            onSuccess={() => {
              setShowFeedbackUploader(false);
              // ページをリロードして最新データを表示
              window.location.reload();
            }}
          />
        </div>
      )}

      {/* 子録音（指導音声）の表示 */}
      {children.length > 0 && (
        <div className="ml-8 space-y-4 border-l-4 border-orange-200 pl-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-3">
            📎 紐づく指導音声 ({children.length}件)
          </h3>
          {children.map((child) => (
            <div
              key={child.id}
              className="bg-orange-50 rounded-lg p-4 border border-orange-200"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getTypeBadge(child.recording_type)}
                  <h4 className="font-bold text-gray-800">{child.title}</h4>
                </div>
                <p className="text-xs text-gray-500">
                  {new Date(child.created_at).toLocaleString("ja-JP")}
                </p>
              </div>

              {child.description && (
                <p className="text-sm text-gray-600 mb-2">{child.description}</p>
              )}

              <audio controls src={child.audio_url} className="w-full mb-2">
                お使いのブラウザは audio 要素をサポートしていません。
              </audio>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>⏱️ {Math.floor(child.duration / 60)}分{child.duration % 60}秒</span>
                  <span>💾 {(child.file_size / 1024 / 1024).toFixed(2)} MB</span>
                </div>

                {/* 分析ボタン */}
                <button
                  onClick={() => handleAnalyze(child.id)}
                  disabled={analyzing}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    analyzing
                      ? "bg-gray-300 cursor-not-allowed"
                      : "bg-purple-500 hover:bg-purple-600 text-white"
                  }`}
                >
                  {analyzing ? "🔍 分析中..." : "🤖 AI分析"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 分析結果表示 */}
      {analysisResult && (
        <div className="mt-4 p-6 bg-purple-50 rounded-lg border-2 border-purple-200">
          <h3 className="text-xl font-bold text-purple-800 mb-4">
            🤖 AI分析結果
          </h3>

          {analysisResult.analysis_summary && (
            <div className="mb-4">
              <h4 className="font-semibold text-gray-700 mb-2">📊 サマリー:</h4>
              <p className="text-gray-700">{analysisResult.analysis_summary}</p>
            </div>
          )}

          {analysisResult.problem_points && analysisResult.problem_points.length > 0 && (
            <div className="mb-4">
              <h4 className="font-semibold text-gray-700 mb-2">❌ 問題点:</h4>
              <ul className="list-disc list-inside space-y-1">
                {analysisResult.problem_points.map((point: string, idx: number) => (
                  <li key={idx} className="text-gray-700">{point}</li>
                ))}
              </ul>
            </div>
          )}

          {analysisResult.correct_approach && analysisResult.correct_approach.length > 0 && (
            <div className="mb-4">
              <h4 className="font-semibold text-gray-700 mb-2">✅ 正解アプローチ:</h4>
              <ul className="list-disc list-inside space-y-1">
                {analysisResult.correct_approach.map((approach: string, idx: number) => (
                  <li key={idx} className="text-gray-700">{approach}</li>
                ))}
              </ul>
            </div>
          )}

          {analysisResult.actionable_knowledge && analysisResult.actionable_knowledge.length > 0 && (
            <div className="mb-4">
              <h4 className="font-semibold text-gray-700 mb-2">💡 学習用ナレッジ:</h4>
              <ul className="list-disc list-inside space-y-1">
                {analysisResult.actionable_knowledge.map((knowledge: string, idx: number) => (
                  <li key={idx} className="text-gray-700">{knowledge}</li>
                ))}
              </ul>
            </div>
          )}

          {analysisResult.script_suggestion && (
            <div className="bg-white rounded p-4 border border-purple-200">
              <h4 className="font-semibold text-gray-700 mb-2">📝 スクリプト提案:</h4>
              <p className="text-gray-700 whitespace-pre-wrap">{analysisResult.script_suggestion}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
