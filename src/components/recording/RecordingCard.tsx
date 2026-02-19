"use client";

import { useState, useEffect } from "react";
import TranscriptRichDisplay from "./TranscriptRichDisplay";
import FeedbackUploader from "./FeedbackUploader";
import { analyzeFeedbackPair } from "@/src/actions/analysis-actions";
import {
  getTranscriptByRecordingId,
  updateRecordingCustomId,
  deleteRecording,
} from "@/src/actions/recording-actions";
import { setRecordingCategory } from "@/src/actions/category-actions";
import type { RecordingCategory } from "@/src/actions/category-actions";

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
  memo?: string;
  category?: string;
  created_at: number;
  updated_at: number;
}

interface RecordingCardProps {
  recording: Recording;
  children: Recording[];
  categories?: RecordingCategory[];
}

// フィードバック音声用の文字起こしボタン
function ChildTranscriptButton({ recordingId, audioUrl }: { recordingId: string; audioUrl?: string }) {
  const [show, setShow] = useState(false);
  const [transcript, setTranscript] = useState<{ id: string; content: string; learning_pending?: boolean } | null | undefined>(undefined);

  const handleToggle = async () => {
    if (!show && transcript === undefined) {
      const t = await getTranscriptByRecordingId(recordingId);
      setTranscript(t ? { id: t.id, content: t.content, learning_pending: !!t.learning_pending } : null);
    }
    setShow(!show);
  };

  return (
    <div className="mb-2">
      <button
        onClick={handleToggle}
        className="text-sm text-[#36332E] hover:text-[#C87A55] font-medium"
      >
        {show ? "文字起こしを閉じる" : "文字起こしを表示"}
      </button>
      {show && transcript !== undefined && (
        <div className="mt-2 p-3 bg-white rounded border border-[#EBE8E3] shadow-sm shadow-stone-200/50">
          {transcript === null ? (
            <p className="text-xs text-[#9E9A95]">文字起こし結果がありません</p>
          ) : (
            <TranscriptRichDisplay
              transcriptId={transcript.id}
              content={transcript.content}
              recordingId={recordingId}
              audioUrl={audioUrl}
              learningPending={!!transcript.learning_pending}
              onSaved={(newContent) => {
                setTranscript({ ...transcript, content: newContent });
              }}
              onLearningSet={() => {
                setTranscript({ ...transcript, learning_pending: true });
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}


export default function RecordingCard({ recording, children, categories = [] }: RecordingCardProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [transcript, setTranscript] = useState<{ id: string; content: string; learning_pending?: boolean } | null | undefined>(undefined);
  const [editingCustomId, setEditingCustomId] = useState(false);
  const [editingCustomIdValue, setEditingCustomIdValue] = useState(recording.custom_id || "");
  const [localCategoryId, setLocalCategoryId] = useState<string | null>(recording.category_id || null);
  const [localCategory, setLocalCategory] = useState(recording.category || "");
  const [localMemo, setLocalMemo] = useState(recording.memo || "");

  useEffect(() => {
    setLocalCategoryId(recording.category_id || null);
    setLocalCategory(recording.category || "");
    setLocalMemo(recording.memo || "");
  }, [recording.category_id, recording.category, recording.memo]);

  // 型バッジ
  const getTypeBadge = (type: string) => {
    switch (type) {
      case "case":
        return (
          <span className="px-3 py-1 bg-[#C87A55] text-white rounded-full text-sm font-medium">
            課題音声
          </span>
        );
      case "model":
        return (
          <span className="px-3 py-1 bg-[#C87A55] text-white rounded-full text-sm font-medium">
            お手本
          </span>
        );
      case "feedback":
        return (
          <span className="px-3 py-1 bg-[#C87A55] text-white rounded-full text-sm font-medium">
            指導音声
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
      setTranscript(t ? { id: t.id, content: t.content, learning_pending: !!t.learning_pending } : null);
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

  // カテゴリを保存（category_id で紐付け）
  const handleSaveCategory = async (categoryId: string | null) => {
    const result = await setRecordingCategory(recording.id, categoryId);
    if (result.success) {
      setLocalCategoryId(categoryId);
      const cat = categoryId ? categories.find((c) => c.id === categoryId) : null;
      setLocalCategory(cat?.name ?? "");
    }
  };

  // 分析を実行
  const handleAnalyze = async (feedbackId: string) => {
    setAnalyzing(true);
    try {
      const result = await analyzeFeedbackPair(recording.id, feedbackId);
      if (result.success) {
        setAnalysisResult(result.data);
        alert("分析が完了しました");
      } else {
        alert(`エラー: ${result.error}`);
      }
    } catch (error) {
      alert(`エラー: ${error instanceof Error ? error.message : "不明なエラー"}`);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm shadow-stone-200/50 border border-[#EBE8E3] p-6">
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
              className="p-1.5 text-[#9E9A95] hover:text-[#36332E] hover:bg-[#FCFAF8] rounded-lg transition-colors"
              title="削除"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            {getTypeBadge(recording.recording_type)}
            <h2 className="text-xl font-bold text-[#36332E]">{recording.title}</h2>
            <span className="px-2 py-1 bg-[#FCFAF8] text-[#9E9A95] rounded text-xs font-mono" title="録音ID">
              ID: {recording.id}
            </span>
            {editingCustomId ? (
              <span className="flex items-center gap-2">
                <input
                  type="text"
                  value={editingCustomIdValue}
                  onChange={(e) => setEditingCustomIdValue(e.target.value)}
                  placeholder="参照ID（例: R001）"
                  className="px-2 py-1 border-2 border-[#EBE8E3] rounded text-sm w-24"
                />
                <button
                  onClick={handleSaveCustomId}
                  className="px-2 py-1 bg-[#C87A55] hover:bg-[#B56A45] text-white rounded text-xs"
                >
                  保存
                </button>
                <button
                  onClick={() => {
                    setEditingCustomId(false);
                    setEditingCustomIdValue(recording.custom_id || "");
                  }}
                  className="px-2 py-1 bg-[#9E9A95] text-white rounded text-xs"
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
                className="px-2 py-1 bg-white border border-[#EBE8E3] text-[#36332E] rounded text-xs hover:bg-[#FCFAF8]"
                title="参照IDを設定"
              >
                {recording.custom_id ? `参照: ${recording.custom_id}` : "IDを設定"}
              </button>
            )}
          </div>
          <p className="text-sm text-[#9E9A95]">
            {new Date(recording.created_at).toLocaleString("ja-JP")}
          </p>
        </div>

        {/* カテゴリ選択 */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-[#9E9A95]">カテゴリ:</span>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => handleSaveCategory(null)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-all duration-200 ${
                !localCategoryId
                  ? "bg-[#C87A55] text-white shadow-sm shadow-stone-200/50"
                  : "bg-white border border-[#EBE8E3] text-[#36332E] hover:bg-[#FCFAF8] hover:shadow-sm hover:shadow-stone-200/50 hover:-translate-y-px"
              }`}
            >
              なし
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleSaveCategory(cat.id)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
                  localCategoryId === cat.id
                    ? "bg-[#C87A55] text-white shadow-sm shadow-stone-200/50"
                    : "bg-white border border-[#EBE8E3] text-[#36332E] hover:bg-[#FCFAF8] hover:shadow-sm hover:shadow-stone-200/50 hover:-translate-y-px"
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: cat.color }}
                />
                {cat.name}
              </button>
            ))}
          </div>
          {categories.length === 0 && (
            <span className="text-xs text-[#9E9A95]">カテゴリ管理から追加してください</span>
          )}
        </div>

        {recording.description && (
          <p className="text-[#36332E] mb-3">{recording.description}</p>
        )}

        <div className="flex items-center gap-4 mb-3">
          <audio
            controls
            src={`/api/recordings/${recording.id}/audio`}
            className="flex-1"
            onError={(e) => {
              const el = e.currentTarget;
              const err = el.error;
              console.error("[音声再生エラー] RecordingCard 親録音", {
                recordingId: recording.id,
                audio_url: recording.audio_url,
                errorCode: err?.code,
                errorMessage: err?.message,
                networkState: el.networkState,
                readyState: el.readyState,
              });
            }}
            onLoadedMetadata={() => {}}
          >
            お使いのブラウザは audio 要素をサポートしていません。
          </audio>
        </div>

        <div className="flex items-center gap-4 text-sm text-[#9E9A95] mb-3">
          <span>{Math.floor(recording.duration / 60)}分{recording.duration % 60}秒</span>
          <span>{(recording.file_size / 1024 / 1024).toFixed(2)} MB</span>
        </div>

        {/* 文字起こしを表示ボタン */}
        <div className="mb-4">
          <button
            onClick={handleShowTranscript}
            className="px-4 py-2 bg-[#C87A55] hover:bg-[#B56A45] text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <span>{showTranscript ? "文字起こしを閉じる" : "文字起こしを表示"}</span>
          </button>
        </div>

        {/* 文字起こし表示・編集エリア */}
        {showTranscript && (
          <div className="mb-4 p-4 bg-[#FCFAF8] rounded-xl border border-[#EBE8E3] shadow-[0_1px_2px_0_rgba(235,232,227,0.5)]">
            {transcript === undefined ? (
              <div className="flex items-center gap-2 text-[#9E9A95]">
                <div className="animate-spin h-5 w-5 border-2 border-[#9E9A95] border-t-transparent rounded-full" />
                <span>読み込み中...</span>
              </div>
            ) : transcript === null ? (
              <p className="text-[#9E9A95]">文字起こし結果がありません</p>
            ) : (
              <TranscriptRichDisplay
                transcriptId={transcript.id}
                content={transcript.content}
                recordingId={recording.id}
                audioUrl={recording.audio_url}
                memo={localMemo}
                learningPending={!!transcript.learning_pending}
                onSaved={(newContent) => {
                  setTranscript({ ...transcript, content: newContent });
                }}
                onMemoSaved={(memo) => setLocalMemo(memo)}
                onLearningSet={() => {
                  setTranscript({ ...transcript, learning_pending: true });
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* 指導音声アップロード（課題音声の場合のみ表示） */}
      {recording.recording_type === "case" && (
        <div className="mb-6">
          <FeedbackUploader
            parentRecordingId={recording.id}
            parentTitle={recording.title}
            onSuccess={() => window.location.reload()}
          />
        </div>
      )}

      {/* 子録音（指導音声）の表示 */}
      {children.length > 0 && (
        <div className="ml-8 space-y-4 border-l-4 border-[#C87A55] pl-6">
          <h3 className="text-lg font-semibold text-[#36332E] mb-3">
            紐づく指導音声 ({children.length}件)
          </h3>
          {children.map((child) => (
            <div
              key={child.id}
              className="bg-[#FCFAF8] rounded-lg p-4 border border-[#EBE8E3] shadow-sm shadow-stone-200/50"
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
                    className="p-1 text-[#9E9A95] hover:text-[#36332E] hover:bg-[#FCFAF8] rounded transition-colors"
                    title="削除"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  {getTypeBadge(child.recording_type)}
                  <h4 className="font-bold text-[#36332E]">{child.title}</h4>
                  <span className="px-2 py-0.5 bg-[#FCFAF8] text-[#9E9A95] rounded text-xs font-mono">
                    親ID: {recording.id} に紐付け
                  </span>
                </div>
                <p className="text-xs text-[#9E9A95]">
                  {new Date(child.created_at).toLocaleString("ja-JP")}
                </p>
              </div>

              {child.description && (
                <p className="text-sm text-[#36332E] mb-2">{child.description}</p>
              )}

              <audio
                controls
                src={`/api/recordings/${child.id}/audio`}
                className="w-full mb-2"
                onError={(e) => {
                  const el = e.currentTarget;
                  const err = el.error;
                  console.error("[音声再生エラー] RecordingCard 子録音", {
                    recordingId: child.id,
                    audio_url: child.audio_url,
                    errorCode: err?.code,
                    errorMessage: err?.message,
                    networkState: el.networkState,
                    readyState: el.readyState,
                  });
                }}
                onLoadedMetadata={() => {}}
              >
                お使いのブラウザは audio 要素をサポートしていません。
              </audio>

              {/* フィードバックの文字起こし */}
              <ChildTranscriptButton recordingId={child.id} audioUrl={child.audio_url} />

              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-3 text-xs text-[#9E9A95]">
                  <span>{Math.floor(child.duration / 60)}分{child.duration % 60}秒</span>
                  <span>{(child.file_size / 1024 / 1024).toFixed(2)} MB</span>
                </div>

                {/* 分析ボタン */}
                <button
                  onClick={() => handleAnalyze(child.id)}
                  disabled={analyzing}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    analyzing
                      ? "bg-[#9E9A95] cursor-not-allowed"
                      : "bg-[#C87A55] hover:bg-[#B56A45] text-white"
                  }`}
                >
                  {analyzing ? "分析中..." : "AI分析"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 分析結果表示 */}
      {analysisResult && (
        <div className="mt-4 p-6 bg-[#FCFAF8] rounded-lg border border-[#EBE8E3] shadow-sm shadow-stone-200/50">
          <h3 className="text-xl font-bold text-[#36332E] mb-4">
            AI分析結果
          </h3>

          {analysisResult.analysis_summary && (
            <div className="mb-4">
              <h4 className="font-semibold text-[#36332E] mb-2">サマリー</h4>
              <p className="text-[#36332E]">{analysisResult.analysis_summary}</p>
            </div>
          )}

          {analysisResult.problem_points && analysisResult.problem_points.length > 0 && (
            <div className="mb-4">
              <h4 className="font-semibold text-[#36332E] mb-2">問題点</h4>
              <ul className="list-disc list-inside space-y-1">
                {analysisResult.problem_points.map((point: string, idx: number) => (
                  <li key={idx} className="text-[#36332E]">{point}</li>
                ))}
              </ul>
            </div>
          )}

          {analysisResult.correct_approach && analysisResult.correct_approach.length > 0 && (
            <div className="mb-4">
              <h4 className="font-semibold text-[#36332E] mb-2">正解アプローチ</h4>
              <ul className="list-disc list-inside space-y-1">
                {analysisResult.correct_approach.map((approach: string, idx: number) => (
                  <li key={idx} className="text-[#36332E]">{approach}</li>
                ))}
              </ul>
            </div>
          )}

          {analysisResult.actionable_knowledge && analysisResult.actionable_knowledge.length > 0 && (
            <div className="mb-4">
              <h4 className="font-semibold text-[#36332E] mb-2">学習用ナレッジ</h4>
              <ul className="list-disc list-inside space-y-1">
                {analysisResult.actionable_knowledge.map((knowledge: string, idx: number) => (
                  <li key={idx} className="text-[#36332E]">{knowledge}</li>
                ))}
              </ul>
            </div>
          )}

          {analysisResult.script_suggestion && (
            <div className="bg-white rounded p-4 border border-[#EBE8E3] shadow-sm shadow-stone-200/50">
              <h4 className="font-semibold text-[#36332E] mb-2">スクリプト提案</h4>
              <p className="text-[#36332E] whitespace-pre-wrap">{analysisResult.script_suggestion}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
