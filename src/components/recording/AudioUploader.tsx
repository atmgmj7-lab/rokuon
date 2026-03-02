"use client";

import { useState, useRef } from "react";

// ローカル開発: 127.0.0.1 の方が安定するためデフォルトに使用
// 本番: NEXT_PUBLIC_API_URL に Render 等のバックエンド URL を設定
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8765";

function buildRawTranscript(
  segments: { start?: number; end?: number; text?: string }[],
  fallbackText: string,
  duration: number
): string {
  if (segments?.length > 0) {
    const lines = segments
      .map(
        (s) =>
          `[${(s.start ?? 0).toFixed(1)}s - ${(s.end ?? 0).toFixed(1)}s] ${(s.text ?? "").trim()}`
      )
      .filter((line) => {
        const afterBracket = line.indexOf("] ");
        return afterBracket >= 0 && line.slice(afterBracket + 2).trim().length > 0;
      });
    const text = lines.join("\n");
    return text.trim() || fallbackText;
  }
  if (fallbackText && duration > 0) {
    return `[0.0s - ${duration.toFixed(1)}s] ${fallbackText}`;
  }
  return fallbackText;
}

function getExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  return lastDot >= 0 ? filename.slice(lastDot) : ".webm";
}

function getMimeType(extension: string): string {
  const mimeTypes: Record<string, string> = {
    ".mp3": "audio/mpeg",
    ".mp4": "audio/mp4",
    ".m4a": "audio/m4a",
    ".wav": "audio/wav",
    ".webm": "audio/webm",
    ".mpeg": "audio/mpeg",
    ".mpga": "audio/mpeg",
  };
  return mimeTypes[extension.toLowerCase()] || "audio/webm";
}

function SubmitButton({ isLoading }: { isLoading: boolean }) {
  return (
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
        "アップロードして文字起こし"
      )}
    </button>
  );
}

export default function AudioUploader() {
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

    const form = e.currentTarget;
    const formData = new FormData(form);
    const title = (formData.get("title") as string) || "";
    const description = (formData.get("description") as string) || "";
    const fileSize = selectedFile.size;

    try {
      const base = API_BASE.replace(/\/$/, "");
      const transcribeUrl = `${base}/transcribe`;
      const transcribeRes = await fetch(transcribeUrl, {
        method: "POST",
        body: (() => {
          const fd = new FormData();
          fd.append("file", selectedFile, selectedFile.name);
          return fd;
        })(),
      });

      if (!transcribeRes.ok) {
        const errText = await transcribeRes.text();
        let errMsg = errText;
        try {
          const errJson = JSON.parse(errText) as { detail?: string; error?: string };
          errMsg = errJson.detail ?? errJson.error ?? errText;
        } catch {
          // ignore
        }
        console.error("[AudioUploader] 文字起こしエラー", {
          url: transcribeUrl,
          status: transcribeRes.status,
          statusText: transcribeRes.statusText,
          body: errText,
        });
        setResult({
          success: false,
          message: `文字起こしエラー: ${errMsg}`,
        });
        return;
      }

      const transcribeData = (await transcribeRes.json()) as {
        success?: boolean;
        text?: string;
        segments?: { start?: number; end?: number; text?: string }[];
        duration?: number;
      };
      const duration = transcribeData.duration ?? 0;
      const rawTranscript = buildRawTranscript(
        transcribeData.segments ?? [],
        transcribeData.text ?? "",
        duration
      );

      const ext = getExtension(selectedFile.name);
      const contentType = getMimeType(ext);

      const presignedRes = await fetch("/api/upload-presigned", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: selectedFile.name,
          contentType: selectedFile.type || contentType,
        }),
      });
      const presignedData = (await presignedRes.json()) as {
        success?: boolean;
        putUrl?: string;
        r2Key?: string;
        audioUrl?: string;
        error?: string;
      };
      if (!presignedRes.ok || !presignedData.putUrl) {
        console.error("[AudioUploader] 署名付きURL取得エラー", {
          status: presignedRes.status,
          data: presignedData,
        });
        setResult({
          success: false,
          message: `アップロード準備エラー: ${presignedData.error ?? "署名付きURLの取得に失敗しました"}`,
        });
        return;
      }

      let putRes: Response;
      try {
        putRes = await fetch(presignedData.putUrl!, {
          method: "PUT",
          body: selectedFile,
          headers: { "Content-Type": contentType },
        });
      } catch (r2FetchError) {
        console.error("[AudioUploader] R2アップロード失敗（ネットワークエラー）", r2FetchError);
        setResult({
          success: false,
          message: "R2へのアップロード中にネットワークエラーが発生しました。R2のCORS設定を確認してください。",
        });
        return;
      }
      if (!putRes.ok) {
        console.error("[AudioUploader] R2アップロードエラー", {
          status: putRes.status,
          statusText: putRes.statusText,
        });
        setResult({
          success: false,
          message: `R2アップロードエラー: ${putRes.status} ${putRes.statusText}`,
        });
        return;
      }

      const saveRes = await fetch("/api/save-recording", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          r2Key: presignedData.r2Key,
          audioUrl: presignedData.audioUrl,
          title: title || selectedFile.name,
          description,
          rawTranscript,
          duration,
          fileSize,
        }),
      });
      const saveData = (await saveRes.json()) as {
        success?: boolean;
        data?: { transcript?: string };
        error?: string;
      };
      if (!saveRes.ok || !saveData.success) {
        console.error("[AudioUploader] 録音保存エラー", {
          status: saveRes.status,
          data: saveData,
        });
        setResult({
          success: false,
          message: `保存エラー: ${saveData.error ?? "録音の保存に失敗しました"}`,
        });
        return;
      }

      setResult({
        success: true,
        message: "アップロードと文字起こしが完了しました",
        transcript: saveData.data?.transcript,
      });
      setSelectedFile(null);
      formRef.current?.reset();
    } catch (error) {
      console.error("[AudioUploader] 予期しないエラー", {
        error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        apiBase: API_BASE,
      });
      setResult({
        success: false,
        message: `エラー: ${error instanceof Error ? error.message : "不明なエラー"}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-lg p-8 border border-stone-200">
        <h2 className="text-2xl font-bold mb-6 text-stone-800">
          テレアポ音声アップロード
        </h2>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
          {/* タイトル入力 */}
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-stone-700 mb-2"
            >
              タイトル
            </label>
            <input
              type="text"
              id="title"
              name="title"
              placeholder="例: 2024年2月14日 架電記録"
              className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-400 focus:border-transparent outline-none transition"
            />
          </div>

          {/* 説明文入力 */}
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-stone-700 mb-2"
            >
              説明（任意）
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              placeholder="録音に関するメモ..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition resize-none"
            />
          </div>

          {/* ファイル選択 */}
          <div>
            <label
              htmlFor="audio"
              className="block text-sm font-medium text-stone-700 mb-2"
            >
              音声ファイル
            </label>
            <div className="relative">
              <input
                type="file"
                id="audio"
                name="audio"
                accept="audio/*"
                onChange={handleFileChange}
                disabled={isLoading}
                className="w-full px-4 py-3 border-2 border-dashed border-stone-300 rounded-lg cursor-pointer hover:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400 transition file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-stone-50 file:text-stone-700 hover:file:bg-stone-100 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
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
          <SubmitButton isLoading={isLoading} />
        </form>

        {/* 結果表示 */}
        {result && (
          <div
            className={`mt-6 p-4 rounded-lg ${
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
              <div className="mt-4 p-4 bg-white rounded border border-stone-200">
                <h3 className="font-semibold text-stone-700 mb-2">
                  文字起こし結果
                </h3>
                <p className="text-stone-600 whitespace-pre-wrap leading-[2.2] tracking-[0.03em]">
                  {result.transcript}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
