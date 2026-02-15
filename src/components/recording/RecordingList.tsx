"use client";

import { useState, useEffect } from "react";
import { getAllRecordings } from "@/src/actions/recording-actions";
import FeedbackUploader from "./FeedbackUploader";

interface Recording {
  id: string;
  title: string;
  description: string | null;
  audio_url: string;
  duration: number;
  file_size: number;
  recording_type: string;
  parent_id: string | null;
  category_id: string | null;
  created_at: number;
  updated_at: number;
}

export default function RecordingList() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRecordingId, setExpandedRecordingId] = useState<string | null>(null);
  const [showFeedbackUploader, setShowFeedbackUploader] = useState<string | null>(null);

  const loadRecordings = async () => {
    setLoading(true);
    const data = await getAllRecordings();
    setRecordings(data);
    setLoading(false);
  };

  useEffect(() => {
    loadRecordings();
  }, []);

  // 親録音のみを取得（フィードバック音声を除外）
  const parentRecordings = recordings.filter((r) => !r.parent_id);

  // 特定の親に紐づくフィードバック音声を取得
  const getFeedbackRecordings = (parentId: string) => {
    return recordings.filter((r) => r.parent_id === parentId);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatFileSize = (bytes: number) => {
    const mb = (bytes / (1024 * 1024)).toFixed(2);
    return `${mb} MB`;
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getRecordingTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      case: "📞 課題音声",
      model: "⭐ トップのお手本",
      feedback: "💬 指導音声",
    };
    return labels[type] || "🎙️ 音声";
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">📚 録音履歴</h2>
        <button
          onClick={loadRecordings}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm"
        >
          🔄 更新
        </button>
      </div>

      {parentRecordings.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl shadow-md">
          <span className="text-6xl mb-4 block">🎙️</span>
          <p className="text-lg text-gray-600">まだ録音がありません</p>
          <p className="text-sm text-gray-500 mt-2">
            上のフォームから音声ファイルをアップロードしてください
          </p>
        </div>
      )}

      <div className="space-y-3">
        {parentRecordings.map((recording) => {
          const feedbacks = getFeedbackRecordings(recording.id);
          const isExpanded = expandedRecordingId === recording.id;
          const showUploader = showFeedbackUploader === recording.id;

          return (
            <div
              key={recording.id}
              className="bg-white rounded-xl shadow-md overflow-hidden border-2 border-gray-200 hover:border-blue-300 transition-colors"
            >
              {/* 親録音 */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">
                        {getRecordingTypeLabel(recording.recording_type)}
                      </span>
                      <h3 className="text-lg font-bold text-gray-800">
                        {recording.title}
                      </h3>
                    </div>
                    {recording.description && (
                      <p className="text-sm text-gray-600 mb-2">
                        {recording.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>⏱️ {formatDuration(recording.duration)}</span>
                      <span>📦 {formatFileSize(recording.file_size)}</span>
                      <span>📅 {formatDate(recording.created_at)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {feedbacks.length > 0 && (
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                        💬 {feedbacks.length}件のフィードバック
                      </span>
                    )}
                    <button
                      onClick={() =>
                        setExpandedRecordingId(isExpanded ? null : recording.id)
                      }
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      {isExpanded ? "▲" : "▼"}
                    </button>
                  </div>
                </div>

                {/* 展開時の詳細 */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t-2 border-gray-200 space-y-3">
                    <audio
                      controls
                      className="w-full"
                      src={recording.audio_url}
                    />

                    {/* フィードバック音声追加ボタン */}
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          setShowFeedbackUploader(
                            showUploader ? null : recording.id
                          )
                        }
                        className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-medium transition-all text-sm"
                      >
                        {showUploader
                          ? "❌ キャンセル"
                          : "➕ フィードバック音声を追加"}
                      </button>
                    </div>

                    {/* フィードバックアップローダー */}
                    {showUploader && (
                      <div className="bg-green-50 rounded-lg p-4 border-2 border-green-300">
                        <FeedbackUploader
                          parentRecordingId={recording.id}
                          parentTitle={recording.title}
                          onSuccess={() => {
                            setShowFeedbackUploader(null);
                            loadRecordings();
                          }}
                        />
                      </div>
                    )}

                    {/* フィードバック音声一覧 */}
                    {feedbacks.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                          <span>💬</span>
                          フィードバック音声（{feedbacks.length}件）
                        </h4>
                        {feedbacks.map((feedback) => (
                          <div
                            key={feedback.id}
                            className="bg-green-50 rounded-lg p-3 border-2 border-green-200"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-bold text-gray-800 text-sm">
                                {feedback.title}
                              </h5>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span>⏱️ {formatDuration(feedback.duration)}</span>
                                <span>📅 {formatDate(feedback.created_at)}</span>
                              </div>
                            </div>
                            {feedback.description && (
                              <p className="text-xs text-gray-600 mb-2">
                                {feedback.description}
                              </p>
                            )}
                            <audio
                              controls
                              className="w-full"
                              src={feedback.audio_url}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
