"use client";

import { useState, useRef } from "react";

interface FeedbackUploaderProps {
  parentRecordingId: string;
  parentTitle: string;
  onSuccess?: () => void;
}

export default function FeedbackUploader({
  parentRecordingId,
  parentTitle,
  onSuccess,
}: FeedbackUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    transcript?: string;
  } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setResult(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedFile) {
      setResult({
        success: false,
        message: "音声ファイルを選択してください",
      });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const form = e.currentTarget;
      const formData = new FormData(form);
      const title = (formData.get("title") as string) || "";
      const description = (formData.get("description") as string) || "";

      // FormData を経由せず、生バイナリで API Route に送信（Vercel ENOENT 回避）
      const res = await fetch("/api/upload-feedback", {
        method: "POST",
        body: selectedFile,
        headers: {
          "x-file-name": selectedFile.name,
          "x-title": title,
          "x-description": description,
          "x-parent-recording-id": parentRecordingId,
        },
      });

      const response = await res.json();
      if (!res.ok) {
        setResult({
          success: false,
          message: `エラー: ${response.error ?? res.statusText}`,
        });
        return;
      }

      if (response.success) {
        setResult({
          success: true,
          message: "指導音声のアップロードと文字起こしが完了しました",
          transcript: response.data?.transcript,
        });
        setSelectedFile(null);
        formRef.current?.reset();
        
        // 成功コールバック
        if (onSuccess) {
          onSuccess();
        }
      } else {
        setResult({
          success: false,
          message: `エラー: ${response.error}`,
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: `エラー: ${error instanceof Error ? error.message : "不明なエラー"}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[#FAF9F6] rounded-lg border border-stone-200 p-6">
      <h3 className="text-xl font-bold text-stone-800 mb-2">
        指導音声をアップロード
      </h3>
      <p className="text-sm text-stone-600 mb-4">
        課題音声: <span className="font-semibold">{parentTitle}</span>
      </p>

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
        {/* タイトル入力 */}
        <div>
          <label
            htmlFor="feedback-title"
            className="block text-sm font-medium text-stone-700 mb-2"
          >
            タイトル
          </label>
          <input
            type="text"
            id="feedback-title"
            name="title"
            placeholder="例: 新人A への指導フィードバック"
            className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-400 focus:border-transparent outline-none transition"
          />
        </div>

        {/* 説明文入力 */}
        <div>
          <label
            htmlFor="feedback-description"
            className="block text-sm font-medium text-stone-700 mb-2"
          >
            説明（任意）
          </label>
          <textarea
            id="feedback-description"
            name="description"
            rows={2}
            placeholder="指導のポイントやメモ..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition resize-none"
          />
        </div>

        {/* ファイル選択 */}
        <div>
          <label
            htmlFor="feedback-audio"
            className="block text-sm font-medium text-stone-700 mb-2"
          >
            指導音声ファイル
          </label>
          <input
            type="file"
            id="feedback-audio"
            name="audio"
            accept="audio/*"
            onChange={handleFileChange}
            disabled={isLoading}
            className="w-full px-4 py-3 border-2 border-dashed border-stone-300 rounded-lg cursor-pointer hover:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400 transition file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-stone-50 file:text-stone-700 hover:file:bg-stone-100 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          {selectedFile && (
            <p className="mt-2 text-sm text-stone-600">
              選択中: <span className="font-medium">{selectedFile.name}</span>
              <span className="text-stone-400 ml-2">
                ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </span>
            </p>
          )}
        </div>

        {/* 送信ボタン */}
        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
            isLoading
              ? "bg-stone-400 cursor-not-allowed"
              : "bg-[#4A463F] hover:bg-[#3E3A34] text-white"
          }`}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="animate-spin h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              解析中（数十秒かかります）
            </span>
          ) : (
            "指導音声をアップロード"
          )}
        </button>
      </form>

      {/* 結果表示 */}
      {result && (
        <div
          className={`mt-4 p-4 rounded-lg ${
            result.success
              ? "bg-[#FAF9F6] border border-stone-200"
              : "bg-stone-100 border border-stone-300"
          }`}
        >
          <p
            className={`font-medium ${
              result.success ? "text-stone-800" : "text-stone-700"
            }`}
          >
            {result.message}
          </p>
          {result.transcript && (
            <div className="mt-3 p-3 bg-white rounded border border-stone-200">
              <h4 className="font-semibold text-stone-700 mb-2 text-sm">
                文字起こし結果
              </h4>
              <p className="text-sm text-stone-600 whitespace-pre-wrap leading-[2.2] tracking-[0.03em]">
                {result.transcript}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
