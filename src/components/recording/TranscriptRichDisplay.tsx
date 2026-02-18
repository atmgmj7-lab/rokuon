"use client";

import { useState, useRef, useEffect } from "react";
import { updateTranscriptContent } from "@/src/actions/recording-actions";
import { addInlineVoiceFeedback, deleteInlineVoiceFeedback } from "@/src/actions/feedback-actions";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export type TranscriptItem =
  | { type: "paragraph"; text: string; startTime?: number; endTime?: number }
  | { type: "feedback"; text: string; audioUrl?: string }
  | { type: "dialogue"; speaker?: string; text: string; startTime?: number; endTime?: number }; // 旧形式の後方互換

export function parseTranscriptItems(content: string | unknown): TranscriptItem[] {
  if (content == null) return [];

  let parsed: unknown;
  const rawStr = typeof content === "string" ? content.trim() : "";

  try {
    if (typeof content === "string") {
      if (!rawStr) return [];
      let toParse = rawStr;
      const arrayMatch = rawStr.match(/\[[\s\S]*\]/);
      if (arrayMatch) toParse = arrayMatch[0];
      parsed = JSON.parse(toParse);
      if (typeof parsed === "string" && (parsed.startsWith("[") || parsed.startsWith("{"))) {
        parsed = JSON.parse(parsed);
      }
    } else if (Array.isArray(content)) {
      parsed = content;
    } else {
      parsed = content;
    }
  } catch {
    return rawStr ? [{ type: "paragraph" as const, text: rawStr }] : [];
  }

  if (!Array.isArray(parsed)) {
    return rawStr ? [{ type: "paragraph" as const, text: rawStr }] : [];
  }

  const items = parsed
    .filter(
      (x: unknown): x is Record<string, unknown> =>
        x != null && typeof x === "object" && ("text" in x || "content" in x)
    )
    .map((x) => {
      const text = String((x.text ?? x.content ?? "") as string);
      const type = x.type === "feedback" ? "feedback" : x.type === "dialogue" ? "dialogue" : "paragraph";
      const startTime =
        x.startTime != null && !Number.isNaN(Number(x.startTime))
          ? Number(x.startTime)
          : undefined;
      const endTime =
        x.endTime != null && !Number.isNaN(Number(x.endTime))
          ? Number(x.endTime)
          : undefined;
      if (type === "feedback") return { type: "feedback" as const, text, audioUrl: typeof x.audioUrl === "string" ? x.audioUrl : undefined };
      if (type === "dialogue")
        return { type: "dialogue" as const, speaker: x.speaker as string | undefined, text, startTime, endTime };
      return { type: "paragraph" as const, text, startTime, endTime };
    })
    .filter((x) => x.text.length > 0);

  return items.length > 0 ? items : (rawStr ? [{ type: "paragraph" as const, text: rawStr }] : []);
}

function hasStartEndTime(
  item: TranscriptItem
): item is TranscriptItem & { startTime: number; endTime: number } {
  return (
    "startTime" in item &&
    "endTime" in item &&
    typeof item.startTime === "number" &&
    typeof item.endTime === "number"
  );
}

interface TranscriptRichDisplayProps {
  transcriptId: string;
  content: string;
  recordingId?: string;
  audioUrl?: string;
  onSaved?: (newContent: string) => void;
}

export default function TranscriptRichDisplay({
  transcriptId,
  content,
  recordingId,
  audioUrl,
  onSaved,
}: TranscriptRichDisplayProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [recordingIndex, setRecordingIndex] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingForIndex, setUploadingForIndex] = useState<number | null>(null);
  const [isDeletingIndex, setIsDeletingIndex] = useState<number | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editItems, setEditItems] = useState<TranscriptItem[]>([]);
  const [editRawText, setEditRawText] = useState("");

  const items = parseTranscriptItems(content);
  const hasStructuredItems = items.length > 0;

  const handleSpeedChange = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) audioRef.current.playbackRate = rate;
  };

  // 現在ハイライトされている段落のインデックスを特定
  const activeIndex = items.findIndex(
    (item) =>
      hasStartEndTime(item) &&
      currentTime >= item.startTime &&
      currentTime <= item.endTime
  );

  // アクティブなインデックスが変わった時だけ、その要素へスムーススクロールする
  useEffect(() => {
    if (activeIndex !== -1) {
      const element = document.getElementById(`transcript-item-${activeIndex}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [activeIndex]);

  // デバッグ: カラオケUI連動の確認用（開発時のみ有効化）
  useEffect(() => {
    const itemsWithTime = items.filter(hasStartEndTime);
    if (hasStructuredItems && audioUrl) {
      console.log("【デバッグ】カラオケUI", {
        currentTime,
        itemsWithTimeCount: itemsWithTime.length,
        activeIndex,
        sampleTimes:
          itemsWithTime.length > 0
            ? itemsWithTime.slice(0, 3).map((i) => ({
                start: i.startTime,
                end: i.endTime,
              }))
            : [],
      });
    }
  }, [currentTime, activeIndex, items, hasStructuredItems, audioUrl]);

  const handleStartEdit = () => {
    if (hasStructuredItems) {
      setEditItems(items.map((i) => ({ ...i })));
    } else {
      setEditRawText(content);
    }
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleCopyText = async () => {
    const textToCopy = items
      .filter((item) => item.type === "paragraph" || item.type === "dialogue")
      .map((item) => item.text)
      .join("\n\n");
    await navigator.clipboard.writeText(textToCopy);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSaveNote = () => {
    console.log("メモ保存:", noteText);
    alert(
      "📝 メモを一時保存しました！\n（※バックエンド保存は次フェーズで実装します）"
    );
  };

  const handleSave = async () => {
    const itemsToSave = editItems.length > 0 ? editItems : items;
    const jsonStr =
      hasStructuredItems && itemsToSave.length > 0
        ? JSON.stringify(itemsToSave)
        : content;
    const result = await updateTranscriptContent(transcriptId, jsonStr);
    if (result.success) {
      onSaved?.(jsonStr);
      setIsEditing(false);
      alert("✅ 保存しました");
    } else {
      alert(`保存に失敗しました: ${result.error}`);
    }
  };

  const startRecording = async (index: number) => {
    if (!recordingId) return;
    if (audioRef.current) audioRef.current.pause();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      setRecordingIndex(index);
    } catch (err) {
      console.error("マイク取得エラー:", err);
      alert("マイクへのアクセスができません。ブラウザの設定を確認してください。");
    }
  };

  const stopRecording = async (index: number) => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive" || !recordingId) return;

    return new Promise<void>((resolve) => {
      recorder.onstop = async () => {
        const mimeType = recorder.mimeType || "audio/webm";
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const ext = mimeType.includes("mp4") ? "m4a" : mimeType.includes("ogg") ? "ogg" : "webm";
        const formData = new FormData();
        formData.append("audio", blob, `recording.${ext}`);

        setRecordingIndex(null);
        setUploadingForIndex(index);
        setIsUploading(true);

        const result = await addInlineVoiceFeedback(recordingId, index, formData);
        setIsUploading(false);
        setUploadingForIndex(null);

        if (result.success && result.data?.newContent) {
          onSaved?.(result.data.newContent);
        } else {
          alert(`保存に失敗しました: ${result.error ?? "不明なエラー"}`);
        }
        resolve();
      };
      recorder.stop();
    });
  };

  const handleDeleteFeedback = async (index: number) => {
    if (!recordingId || !confirm("このアドバイスを削除しますか？")) return;
    setIsDeletingIndex(index);
    const result = await deleteInlineVoiceFeedback(recordingId, index);
    setIsDeletingIndex(null);
    if (result.success && result.data?.newContent) {
      onSaved?.(result.data.newContent);
    } else {
      alert("削除に失敗しました");
    }
  };

  const updateItem = (idx: number, field: "speaker" | "text", value: string) => {
    setEditItems((prev) => {
      const base = prev.length > 0 ? prev : items;
      return base.map((item, i) =>
        i === idx ? { ...item, [field]: value } : item
      );
    });
  };

  // 編集モード（JSON配列）
  if (isEditing && hasStructuredItems) {
    const displayEditItems = editItems.length > 0 ? editItems : items;
    return (
      <div className="space-y-4">
        {displayEditItems.map((item, idx) => (
          <div
            key={idx}
            className={`p-4 rounded-lg border ${
              item.type === "feedback"
                ? "bg-amber-50 border-amber-200"
                : "bg-gray-50 border-gray-200"
            }`}
          >
            {"speaker" in item && (
              <>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  発言者（旧形式）
                </label>
                <input
                  type="text"
                  value={item.speaker ?? ""}
                  onChange={(e) => updateItem(idx, "speaker", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-2"
                />
              </>
            )}
            <label className="block text-xs font-medium text-gray-500 mb-1">
              内容
            </label>
            <textarea
              value={item.text}
              onChange={(e) => updateItem(idx, "text", e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        ))}
        <div className="flex gap-2 pt-2">
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm"
          >
            保存する
          </button>
          <button
            onClick={handleCancelEdit}
            className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium text-sm"
          >
            キャンセル
          </button>
        </div>
      </div>
    );
  }

  // 編集モード（プレーンテキスト）
  if (!hasStructuredItems && isEditing) {
    return (
      <div className="space-y-3">
        <textarea
          value={editRawText}
          onChange={(e) => setEditRawText(e.target.value)}
          rows={8}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
        <div className="flex gap-2">
          <button
            onClick={async () => {
              const result = await updateTranscriptContent(
                transcriptId,
                editRawText
              );
              if (result.success) {
                onSaved?.(editRawText);
                setIsEditing(false);
                alert("✅ 保存しました");
              }
            }}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium"
          >
            保存する
          </button>
          <button
            onClick={handleCancelEdit}
            className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm font-medium"
          >
            キャンセル
          </button>
        </div>
      </div>
    );
  }

  // 表示モード（プレーンテキスト）— JSON配列の場合はカラオケUIへ
  if (
    !hasStructuredItems ||
    (items.length === 1 &&
      items[0].type !== "feedback" &&
      (items[0] as { startTime?: number }).startTime === undefined &&
      !items[0].text.includes("{"))
  ) {
    return (
      <div>
        <button
          onClick={handleStartEdit}
          className="mb-2 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm"
        >
          ✏️ 編集する
        </button>
        <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
          {content}
        </p>
      </div>
    );
  }

  // 表示モード（JSON配列）— カラオケUI
  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start">
      <div className="flex-1 w-full">
        {audioUrl && (
          <div className="sticky top-0 z-10 bg-white pb-4 mb-4 border-b border-gray-100">
            <audio
              ref={audioRef}
              src={audioUrl}
              controls
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
              onSeeked={(e) => setCurrentTime(e.currentTarget.currentTime)}
              onLoadedMetadata={(e) => {
                e.currentTarget.playbackRate = playbackRate;
              }}
              className="w-full h-10 rounded-md shadow-sm"
            />
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-gray-500">再生速度:</span>
              {[1.0, 1.5, 2.0].map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => handleSpeedChange(rate)}
                  className={`px-2.5 py-1 rounded text-sm font-medium transition-colors ${
                    playbackRate === rate
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="mb-3 flex flex-wrap gap-2">
          <button
            onClick={handleStartEdit}
            className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm"
          >
            ✏️ 編集する
          </button>
          <button
            onClick={handleCopyText}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm border border-gray-200"
          >
            {isCopied ? "✅ コピーしました" : "📋 テキストのみコピー"}
          </button>
        </div>
        <div>
        {items.map((item, idx) =>
          item.type === "feedback" ? (
            <div
              key={idx}
              className="relative mb-6 p-5 bg-yellow-50 border-l-4 border-yellow-500 rounded-r-lg group"
            >
              {recordingId && (
                <button
                  type="button"
                  onClick={() => handleDeleteFeedback(idx)}
                  disabled={isDeletingIndex === idx}
                  className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="アドバイスを削除"
                >
                  {isDeletingIndex === idx ? "⏳" : "🗑️"}
                </button>
              )}
              <div className="flex items-center gap-2 mb-2 pr-8">
                <span className="text-lg" aria-hidden>💡</span>
                <span className="text-sm font-bold text-yellow-800">
                  マネージャーのアドバイス
                </span>
              </div>
              <p className="text-yellow-900 leading-relaxed font-medium whitespace-pre-wrap">
                {item.text}
              </p>
              {item.audioUrl && (
                <audio src={item.audioUrl} controls className="h-8 mt-2" />
              )}
            </div>
          ) : (
            <div
              key={idx}
              id={`transcript-item-${idx}`}
              className={`group relative cursor-pointer transition-all duration-300 ease-in-out border-l-4 rounded-r px-4 py-3 mb-6 last:mb-0 ${
                (() => {
                  const isActive =
                    !!audioUrl &&
                    item.startTime !== undefined &&
                    item.endTime !== undefined &&
                    currentTime >= item.startTime &&
                    currentTime <= item.endTime;
                  return isActive
                    ? "bg-blue-50 border-blue-400"
                    : "hover:bg-gray-50 border-transparent";
                })()
              }`}
              onClick={() => {
                if (audioRef.current && item.startTime !== undefined) {
                  const targetTime = Number(item.startTime);
                  if (!Number.isNaN(targetTime)) {
                    audioRef.current.currentTime = targetTime;
                    audioRef.current.play();
                    console.log("【デバッグ】段落クリック再生", {
                      index: idx,
                      startTime: targetTime,
                      audioCurrentTime: audioRef.current.currentTime,
                    });
                  }
                }
              }}
            >
              {recordingId && (
                <>
                  {uploadingForIndex === idx && isUploading ? (
                    <span className="absolute top-2 right-2 inline-flex items-center gap-1 text-sm text-gray-500">
                      <span className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                      ⏳ 保存中...
                    </span>
                  ) : recordingIndex === idx ? (
                    <button
                      type="button"
                      className="absolute top-2 right-2 opacity-100 bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-medium shadow-sm hover:bg-red-200 animate-pulse"
                      onClick={(e) => {
                        e.stopPropagation();
                        stopRecording(idx);
                      }}
                    >
                      🛑 録音停止
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium shadow-sm hover:bg-blue-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        startRecording(idx);
                      }}
                    >
                      🎤 音声で指導
                    </button>
                  )}
                </>
              )}
              {"startTime" in item && "endTime" in item && item.startTime != null && item.endTime != null && (
                <span className="inline-block text-xs text-gray-500 mb-1 font-mono select-none">
                  {formatTime(item.startTime)} - {formatTime(item.endTime)}
                </span>
              )}
              <p className="text-gray-800 text-base leading-relaxed whitespace-pre-wrap pr-24">
                {item.text}
              </p>
            </div>
          )
        )}
        </div>
      </div>
      <div className="w-full lg:w-80 flex-shrink-0 sticky top-4 space-y-3">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">📝</span>
            <h3 className="font-bold text-gray-800">トークメモ・抜粋</h3>
          </div>
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="商談の重要ポイントや、抜粋したいトークをここにメモできます..."
            className="w-full h-64 p-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
          />
          <button
            onClick={handleSaveNote}
            className="w-full mt-3 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg text-sm font-medium transition-colors"
          >
            メモを保存
          </button>
        </div>
      </div>
    </div>
  );
}
