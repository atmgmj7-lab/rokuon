"use client";

import { useRef, useState } from "react";
import { Loader2, Mic, Square, Trash2 } from "lucide-react";

type Props = {
  nodeId: string;
  audioUrl: string | null;
  r2Key?: string | null;
  onSaved?:   (id: string, audioUrl: string, r2Key: string) => void;
  onDeleted?: (id: string) => void;
};

function getSupportedMimeType(): string {
  for (const t of ["audio/webm", "audio/mp4", "audio/ogg"]) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) return t;
  }
  return "audio/webm";
}

export default function NodeVoiceNote({ nodeId, audioUrl, r2Key, onSaved, onDeleted }: Props) {
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting,  setDeleting]  = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef        = useRef<Blob[]>([]);

  const start = async () => {
    setError(null);
    try {
      const stream   = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedMimeType();
      const mr       = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => upload(stream, mimeType);
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

  const upload = async (stream: MediaStream, mimeType: string) => {
    stream.getTracks().forEach((t) => t.stop());
    setUploading(true);
    try {
      const ext      = mimeType.includes("mp4") ? ".mp4" : mimeType.includes("ogg") ? ".ogg" : ".webm";
      const blob     = new Blob(chunksRef.current, { type: mimeType });
      const filename = `mindmap_${nodeId}_${Date.now()}${ext}`;

      const presRes  = await fetch("/api/mindmap-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename, contentType: mimeType }),
      });
      const presJson = await presRes.json() as { putUrl?: string; r2Key?: string; audioUrl?: string; error?: string };

      if (!presRes.ok || !presJson.putUrl || !presJson.r2Key || !presJson.audioUrl) {
        throw new Error(presJson.error ?? "アップロード準備に失敗しました");
      }

      const putRes = await fetch(presJson.putUrl, {
        method: "PUT",
        headers: { "Content-Type": mimeType },
        body: blob,
      });
      if (!putRes.ok) throw new Error(`アップロードに失敗しました (${putRes.status})`);

      onSaved?.(nodeId, presJson.audioUrl, presJson.r2Key);
    } catch (e) {
      setError(e instanceof Error ? e.message : "アップロード失敗");
    } finally {
      setUploading(false);
    }
  };

  const deleteAudio = async () => {
    setDeleting(true);
    try {
      if (r2Key) {
        await fetch("/api/mindmap-audio", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ r2Key }),
        });
      }
      onDeleted?.(nodeId);
    } catch {
      setError("削除に失敗しました");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {audioUrl ? (
        <>
          <audio controls src={audioUrl} className="h-7 w-[140px]" />
          <button
            onClick={deleteAudio}
            disabled={deleting}
            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-stone-100 hover:bg-red-100 disabled:opacity-60 text-stone-500 hover:text-red-600 text-[10px] font-semibold transition-colors"
            title="音声を削除"
          >
            {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
          </button>
        </>
      ) : (
        <span className="text-[10px] text-stone-400">音声なし</span>
      )}

      {!audioUrl && (
        recording ? (
          <button
            onClick={stop}
            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-600 text-white text-[10px] font-semibold animate-pulse"
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
        )
      )}

      {error && <span className="text-[10px] text-red-600">{error}</span>}
    </div>
  );
}
