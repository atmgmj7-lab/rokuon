"use client";

import { useState } from "react";
import TranscriptRichDisplay from "./TranscriptRichDisplay";
import { analyzeFeedbackPair } from "@/src/actions/analysis-actions";
import {
  getTranscriptByRecordingId,
  updateRecordingCustomId,
  deleteRecording,
} from "@/src/actions/recording-actions";

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
  custom_id?: string;
  created_at: number;
  updated_at: number;
}

interface RecordingCardProps {
  recording: Recording;
  children: Recording[];
}

// フィードバック音声用の文字起こしボタン
function ChildTranscriptButton({ recordingId, audioUrl }: { recordingId: string; audioUrl?: string }) {
  const [show, setShow] = useState(false);
  const [transcript, setTranscript] = useState<{ id: string; content: string } | null | undefined>(undefined);

  const handleToggle = async () => {
    if (!show && transcript === undefined) {
      const t = await getTranscriptByRecordingId(recordingId);
      setTranscript(t ? { id: t.id, content: t.content } : null);
    }
    setShow(!show);
  };

  return (
    <div className="mb-2">
      <button
        onClick={handleToggle}
        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
      >
        {show ? "📝 文字起こしを閉じる" : "📝 文字起こしを表示"}
      </button>
      {show && transcript !== undefined && (
        <div className="mt-2 p-3 bg-white rounded border border-orange-200">
          {transcript === null ? (
            <p className="text-xs text-gray-500">文字起こし結果がありません</p>
          ) : (
            <TranscriptRichDisplay
              transcriptId={transcript.id}
              content={transcript.content}
              recordingId={recordingId}
              audioUrl={audioUrl}
              onSaved={(newContent) => {
                setTranscript({ ...transcript, content: newContent });
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default function RecordingCard({ recording, children }: RecordingCardProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [transcript, setTranscript] = useState<{ id: string; content: string } | null | undefined>(undefined);
  const [editingCustomId, setEditingCustomId] = useState(false);
  const [editingCustomIdValue, setEditingCustomIdValue] = useState(recording.custom_id || "");

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

  // 文字起こしを表示
  const handleShowTranscript = async () => {
    if (!showTranscript && transcript === undefined) {
      const t = await getTranscriptByRecordingId(recording.id);
      setTranscript(t ? { id: t.id, content: t.content } : null);
    }
    setShowTranscript(!showTranscript);
  };

  // カスタムIDを保存
  const handleSaveCustomId = async () => {
    const result = await updateRecordingCustomId(recording.id, editingCustomIdValue.trim());
    if (result.success) {
      setEditingCustomId(false);
      window.location.reload();
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
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={async () => {
                if (window.confirm("本当にこの録音データを削除しますか？")) {
                  const result = await deleteRecording(recording.id);
                  if (result.success) {
                    window.location.reload();
                  } else {
                    alert(`削除に失敗しました: ${result.error}`);
                  }
                }
              }}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="削除"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            {getTypeBadge(recording.recording_type)}
            <h2 className="text-xl font-bold text-gray-800">{recording.title}</h2>
            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-mono" title="録音ID">
              ID: {recording.id}
            </span>
            {editingCustomId ? (
              <span className="flex items-center gap-2">
                <input
                  type="text"
                  value={editingCustomIdValue}
                  onChange={(e) => setEditingCustomIdValue(e.target.value)}
                  placeholder="参照ID（例: R001）"
                  className="px-2 py-1 border-2 border-blue-300 rounded text-sm w-24"
                />
                <button
                  onClick={handleSaveCustomId}
                  className="px-2 py-1 bg-blue-600 text-white rounded text-xs"
                >
                  保存
                </button>
                <button
                  onClick={() => {
                    setEditingCustomId(false);
                    setEditingCustomIdValue(recording.custom_id || "");
                  }}
                  className="px-2 py-1 bg-gray-400 text-white rounded text-xs"
                >
                  キャンセル
                </button>
              </span>
            ) : (
              <button
                onClick={() => {
                  setEditingCustomId(true);
                  setEditingCustomIdValue(recording.custom_id || "");
                }}
                className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                title="参照IDを設定"
              >
                {recording.custom_id ? `参照: ${recording.custom_id}` : "➕ IDを設定"}
              </button>
            )}
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

        <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
          <span>⏱️ {Math.floor(recording.duration / 60)}分{recording.duration % 60}秒</span>
          <span>💾 {(recording.file_size / 1024 / 1024).toFixed(2)} MB</span>
        </div>

        {/* 文字起こしを表示ボタン */}
        <div className="mb-4">
          <button
            onClick={handleShowTranscript}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <span>{showTranscript ? "📝 文字起こしを閉じる" : "📝 文字起こしを表示"}</span>
          </button>
        </div>

        {/* 文字起こし表示・編集エリア */}
        {showTranscript && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
            {transcript === undefined ? (
              <div className="flex items-center gap-2 text-gray-500">
                <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full" />
                <span>読み込み中...</span>
              </div>
            ) : transcript === null ? (
              <p className="text-gray-500">文字起こし結果がありません</p>
            ) : (
              <TranscriptRichDisplay
                transcriptId={transcript.id}
                content={transcript.content}
                recordingId={recording.id}
                audioUrl={recording.audio_url}
                onSaved={(newContent) => {
                  setTranscript({ ...transcript, content: newContent });
                }}
              />
            )}
          </div>
        )}
      </div>

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
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={async () => {
                      if (window.confirm("本当にこの録音データを削除しますか？")) {
                        const result = await deleteRecording(child.id);
                        if (result.success) {
                          window.location.reload();
                        } else {
                          alert(`削除に失敗しました: ${result.error}`);
                        }
                      }
                    }}
                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="削除"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  {getTypeBadge(child.recording_type)}
                  <h4 className="font-bold text-gray-800">{child.title}</h4>
                  <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-mono">
                    親ID: {recording.id} に紐付け
                  </span>
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

              {/* フィードバックの文字起こし */}
              <ChildTranscriptButton recordingId={child.id} audioUrl={child.audio_url} />

              <div className="flex items-center justify-between mt-2">
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
