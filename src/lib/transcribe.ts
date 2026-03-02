/**
 * 文字起こしユーティリティ
 *
 * USE_MLX_WHISPER=true のとき mlx-whisper ローカルAPI を優先（APIコスト0）。
 * 失敗時または未設定時は OpenAI Whisper にフォールバック。
 */

const MLX_WHISPER_URL = process.env.MLX_WHISPER_URL || process.env.NEXT_PUBLIC_API_URL || "https://rokuon.onrender.com";
const USE_MLX_WHISPER = process.env.USE_MLX_WHISPER === "true";

export type TranscriptionResult = {
  duration: number;
  text?: string;
  segments?: { start: number; end: number; text: string }[];
};

/** mlx-whisper ローカルAPI（APIコスト0）を呼び出し */
async function transcribeWithMlxWhisper(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<TranscriptionResult> {
  const formData = new FormData();
  formData.append("file", new Blob([new Uint8Array(buffer)], { type: contentType }), filename);

  const res = await fetch(`${MLX_WHISPER_URL}/transcribe`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`mlx-whisper error: ${res.status} ${err}`);
  }

  const data = (await res.json()) as { text?: string; segments?: { start: number; end: number; text: string }[] };
  const segments = data.segments ?? [];
  const duration = segments.length > 0 ? Math.max(...segments.map((s) => s.end)) : 0;
  return {
    duration,
    text: data.text ?? "",
    segments: segments.map((s) => ({ start: s.start, end: s.end, text: s.text ?? "" })),
  };
}

/** OpenAI Whisper API を呼び出し */
async function transcribeWithWhisper(
  buffer: Buffer,
  filename: string,
  contentType: string,
  prompt: string
): Promise<TranscriptionResult> {
  const formData = new FormData();
  formData.append("file", new Blob([new Uint8Array(buffer)], { type: contentType }), filename);
  formData.append("model", "whisper-1");
  formData.append("language", "ja");
  formData.append("prompt", prompt);
  formData.append("response_format", "verbose_json");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Whisper API error: ${res.status} ${err}`);
  }
  const data = (await res.json()) as { duration?: number; text?: string; segments?: { start: number; end: number; text: string }[] };
  return {
    duration: data.duration ?? 0,
    text: data.text,
    segments: data.segments,
  };
}

/** 文字起こし実行（mlx-whisper優先、失敗時はOpenAI Whisperにフォールバック） */
export async function transcribe(
  buffer: Buffer,
  filename: string,
  contentType: string,
  prompt: string
): Promise<TranscriptionResult> {
  if (USE_MLX_WHISPER) {
    try {
      return await transcribeWithMlxWhisper(buffer, filename, contentType);
    } catch (e) {
      console.warn("mlx-whisper failed, falling back to OpenAI Whisper:", e);
    }
  }
  return transcribeWithWhisper(buffer, filename, contentType, prompt);
}
