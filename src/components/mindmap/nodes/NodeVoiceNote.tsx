"use client";

import { useRef, useState } from "react";
import { Loader2, Mic, Square } from "lucide-react";

type Props = {
  nodeId: string;
  audioUrl: string | null;
  onSaved?: (id: string, audioUrl: string, r2Key: string) => void;
};

export default function NodeVoiceNote({ nodeId, audioUrl, onSaved }: Props) {
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const start = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => upload(stream);
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
    } catch {
      setError("マイクの許可が必要です");
    }
  };

  const stop = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const upload = async (stream: MediaStream) => {
    stream.getTracks().forEach((t) => t.stop());
    setUploading(true);
    try {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const filename = `mindmap_${nodeId}_${Date.now()}.webm`;
      const presRes = await fetch("/api/upload-presigned", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename, contentType: "audio/webm" }),
      });
      const presJson = (await presRes.json()) as { putUrl?: string; r2Key?: string; audioUrl?: string };
      if (!presRes.ok || !presJson.putUrl || !presJson.r2Key || !presJson.audioUrl) {
        throw new Error("アップロード準備に失敗しました");
      }
      const putRes = await fetch(presJson.putUrl, {
        method: "PUT",
        headers: { "Content-Type": "audio/webm" },
        body: blob,
      });
      if (!putRes.ok) {
        throw new Error(`アップロードに失敗しました (${putRes.status})`);
      }
      onSaved?.(nodeId, presJson.audioUrl, presJson.r2Key);
    } catch (e) {
      setError(e instanceof Error ? e.message : "アップロード失敗");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {audioUrl ? (
        <audio controls src={audioUrl} className="h-7 w-[160px]" />
      ) : (
        <span className="text-[10px] text-stone-400">音声なし</span>
      )}

      {recording ? (
        <button
          onClick={stop}
          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-600 text-white text-[10px] font-semibold"
          title="録音停止"
        >
          <Square className="w-3 h-3" /> 停止
        </button>
      ) : (
        <button
          onClick={start}
          disabled={uploading}
          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-stone-100 hover:bg-stone-200 disabled:opacity-60 text-stone-700 text-[10px] font-semibold"
          title="録音"
        >
          {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mic className="w-3 h-3" />}
          録音
        </button>
      )}

      {error && <span className="text-[10px] text-red-600">{error}</span>}
    </div>
  );
}

