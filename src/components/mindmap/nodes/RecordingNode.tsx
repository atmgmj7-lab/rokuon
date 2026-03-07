"use client";
import { Handle, Position, NodeProps } from "reactflow";
import { useState, useRef } from "react";

export interface RecordingNodeData {
  label: string;
  audio_url?: string | null;
  color?: string;
  onRecordingSaved?: (id: string, audioUrl: string, r2Key: string) => void;
}

export default function RecordingNode({ id, data, selected }: NodeProps<RecordingNodeData>) {
  const [recording, setRecording]   = useState(false);
  const [uploading, setUploading]   = useState(false);
  const [audioUrl, setAudioUrl]     = useState(data.audio_url ?? null);
  const [error, setError]           = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef        = useRef<Blob[]>([]);
  const color = data.color ?? "#EF4444";

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => handleUpload(stream);
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
    } catch {
      setError("マイクの許可が必要です");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const handleUpload = async (stream: MediaStream) => {
    stream.getTracks().forEach((t) => t.stop());
    setUploading(true);
    try {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const filename = `mindmap_${id}_${Date.now()}.webm`;

      // 1. Presigned URL 取得
      const presRes = await fetch("/api/upload-presigned", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename, contentType: "audio/webm" }),
      });
      const presJson = await presRes.json() as { putUrl: string; r2Key: string; audioUrl: string };
      if (!presRes.ok) throw new Error("URL取得失敗");

      // 2. R2 直接アップロード
      await fetch(presJson.putUrl, {
        method: "PUT",
        headers: { "Content-Type": "audio/webm" },
        body: blob,
      });

      setAudioUrl(presJson.audioUrl);
      data.onRecordingSaved?.(id, presJson.audioUrl, presJson.r2Key);
    } catch (e) {
      setError(e instanceof Error ? e.message : "アップロード失敗");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className={`rounded-xl border-2 bg-white shadow-sm min-w-[180px] max-w-[240px] transition-shadow ${
        selected ? "shadow-lg ring-2 ring-red-300" : ""
      }`}
      style={{ borderColor: color }}
    >
      <Handle type="target" position={Position.Top}    style={{ background: color }} />
      <Handle type="source" position={Position.Bottom} style={{ background: color }} />
      <Handle type="target" position={Position.Left}   id="left"  style={{ background: color }} />
      <Handle type="source" position={Position.Right}  id="right" style={{ background: color }} />

      <div className="px-3 py-2 rounded-t-xl text-white text-[10px] font-bold" style={{ backgroundColor: color }}>
        🎙️ {data.label}
      </div>

      <div className="px-3 py-3 space-y-2">
        {audioUrl ? (
          <audio controls src={audioUrl} className="w-full h-8" />
        ) : (
          <p className="text-[11px] text-stone-400 text-center">録音なし</p>
        )}

        <div className="flex justify-center">
          {recording ? (
            <button
              onClick={stopRecording}
              className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white rounded-full text-[11px] font-bold animate-pulse"
            >
              ■ 停止
            </button>
          ) : uploading ? (
            <span className="text-[11px] text-stone-400">アップロード中...</span>
          ) : (
            <button
              onClick={startRecording}
              className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-600 hover:bg-red-200 rounded-full text-[11px] font-bold"
            >
              ● 録音
            </button>
          )}
        </div>

        {error && <p className="text-[10px] text-red-500 text-center">{error}</p>}
      </div>
    </div>
  );
}
