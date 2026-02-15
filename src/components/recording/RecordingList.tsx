"use client";

import { useState, useEffect } from "react";
import { 
  getAllRecordings, 
  getTranscriptByRecordingId,
  updateTranscript 
} from "@/src/actions/recording-actions";
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

interface Transcript {
  id: string;
  recording_id: string;
  content: string;
  language: string | null;
  created_at: number;
}

export default function RecordingList() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRecordingId, setExpandedRecordingId] = useState<string | null>(null);
  const [showFeedbackUploader, setShowFeedbackUploader] = useState<string | null>(null);
  const [transcripts, setTranscripts] = useState<{ [key: string]: Transcript | null }>({});
  const [editingTranscriptId, setEditingTranscriptId] = useState<string | null>(null);
  const [editingTranscriptContent, setEditingTranscriptContent] = useState("");

  const loadRecordings = async () => {
    setLoading(true);
    const data = await getAllRecordings();
    setRecordings(data);
    setLoading(false);
  };

  const loadTranscript = async (recordingId: string) => {
    if (transcripts[recordingId] === undefined) {
      const transcript = await getTranscriptByRecordingId(recordingId);
      setTranscripts((prev) => ({ ...prev, [recordingId]: transcript }));
    }
  };

  const handleEditTranscript = (transcript: Transcript) => {
    setEditingTranscriptId(transcript.id);
    setEditingTranscriptContent(transcript.content);
  };

  const handleSaveTranscript = async (transcriptId: string) => {
    const result = await updateTranscript(transcriptId, editingTranscriptContent);
    if (result.success) {
      // ローカル状態を更新
      setTranscripts((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((key) => {
          if (updated[key]?.id === transcriptId) {
            updated[key] = { ...updated[key]!, content: editingTranscriptContent };
          }
        });
        return updated;
      });
      setEditingTranscriptId(null);
      alert("✅ 文字起こしを更新しました");
    } else {
      alert("❌ 更新に失敗しました");
    }
  };

  const handleCancelEdit = () => {
    setEditingTranscriptId(null);
    setEditingTranscriptContent("");
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
          const transcript = transcripts[recording.id];

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
                      onClick={() => {
                        setExpandedRecordingId(isExpanded ? null : recording.id);
                        if (!isExpanded) {
                          loadTranscript(recording.id);
                        }
                      }}
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

                    {/* 文字起こし結果 */}
                    <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-gray-800 flex items-center gap-2">
                          <span>📝</span> 文字起こし結果
                        </h4>
                        {transcript && (
                          <button
                            onClick={() =>
                              editingTranscriptId === transcript.id
                                ? handleCancelEdit()
                                : handleEditTranscript(transcript)
                            }
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                              editingTranscriptId === transcript.id
                                ? "bg-gray-500 hover:bg-gray-600 text-white"
                                : "bg-blue-500 hover:bg-blue-600 text-white"
                            }`}
                          >
                            {editingTranscriptId === transcript.id ? "✖️ キャンセル" : "✏️ 編集"}
                          </button>
                        )}
                      </div>

                      {transcript === undefined ? (
                        <div className="text-center py-4">
                          <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2" />
                          <p className="text-sm text-gray-500">読み込み中...</p>
                        </div>
                      ) : transcript === null ? (
                        <p className="text-sm text-gray-500 text-center py-4">
                          文字起こし結果がありません
                        </p>
                      ) : editingTranscriptId === transcript.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={editingTranscriptContent}
                            onChange={(e) => setEditingTranscriptContent(e.target.value)}
                            rows={10}
                            className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSaveTranscript(transcript.id)}
                              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition-colors"
                            >
                              💾 保存
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-bold transition-colors"
                            >
                              キャンセル
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                            {transcript.content}
                          </p>
                        </div>
                      )}
                    </div>

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
                        {feedbacks.map((feedback) => {
                          const feedbackTranscript = transcripts[feedback.id];
                          return (
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
                                className="w-full mb-2"
                                src={feedback.audio_url}
                              />

                              {/* フィードバックの文字起こし */}
                              <div className="bg-white rounded-lg p-3 border border-green-200">
                                <h6 className="text-xs font-bold text-gray-700 mb-2">📝 文字起こし:</h6>
                                {feedbackTranscript === undefined ? (
                                  <button
                                    onClick={() => loadTranscript(feedback.id)}
                                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                                  >
                                    表示する
                                  </button>
                                ) : feedbackTranscript === null ? (
                                  <p className="text-xs text-gray-500">文字起こし結果がありません</p>
                                ) : (
                                  <p className="text-xs text-gray-700 whitespace-pre-wrap">
                                    {feedbackTranscript.content}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
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
