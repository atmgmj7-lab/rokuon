"""
OpenAI Whisper API による文字起こし
"""
import os
import openai

# 句読点（ここで段落を区切る）
_SENTENCE_ENDINGS = ("。", "！", "？", ".", "!", "?", "…", "、、")

# 段落分割パラメータ
_SILENCE_THRESHOLD = 1.5   # この秒数以上の無音で段落を切る
_MAX_DURATION      = 30.0  # この秒数を超えたら強制的に段落を切る


def _merge_segments(raw_segments: list) -> list:
    """
    OpenAI の細切れ segments を読みやすい段落にまとめる。

    分割ルール（優先順位順）:
      1. 無音ギャップ >= _SILENCE_THRESHOLD 秒
      2. 句読点（。！？など）で終わる
      3. 累積時間 >= _MAX_DURATION 秒（強制）
    """
    if not raw_segments:
        return []

    paragraphs = []
    buf_texts  = []
    buf_start  = raw_segments[0]["start"]
    buf_end    = raw_segments[0]["end"]

    def flush():
        nonlocal buf_texts, buf_start, buf_end
        text = "".join(buf_texts).strip()
        if text:
            paragraphs.append({
                "type":      "paragraph",
                "text":      text,
                "startTime": buf_start,
                "endTime":   buf_end,
            })
        buf_texts = []

    for i, seg in enumerate(raw_segments):
        text = seg["text"].strip()
        if not text:
            continue

        gap      = seg["start"] - buf_end if buf_texts else 0.0
        duration = seg["end"]   - buf_start if buf_texts else 0.0

        # 分割条件を判定（テキストを追加する前に確認）
        if buf_texts and (gap >= _SILENCE_THRESHOLD or duration >= _MAX_DURATION):
            flush()
            buf_start = seg["start"]

        buf_texts.append(text)
        buf_end = seg["end"]

        # 句読点で終わる → 追加後に区切る
        if text.endswith(_SENTENCE_ENDINGS):
            flush()
            if i + 1 < len(raw_segments):
                buf_start = raw_segments[i + 1]["start"]
                buf_end   = raw_segments[i + 1]["start"]

    flush()
    return paragraphs


def transcribe_with_openai_whisper(audio_path: str) -> dict:
    """
    OpenAI Whisper API で音声を文字起こし

    Returns:
        {
            "text": str,
            "paragraphs": [{"type": "paragraph", "text": str, "startTime": float, "endTime": float}]
        }
    """
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY が設定されていません")

    client = openai.OpenAI(api_key=api_key)

    with open(audio_path, "rb") as audio_file:
        result = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            response_format="verbose_json",
        )

    if hasattr(result, "segments") and result.segments:
        raw = [
            {"start": s.start, "end": s.end, "text": s.text}
            for s in result.segments
        ]
        paragraphs = _merge_segments(raw)
        text = "\n".join(p["text"] for p in paragraphs)
    else:
        text = result.text if hasattr(result, "text") else ""
        paragraphs = [{"type": "paragraph", "text": text, "startTime": 0.0, "endTime": 0.0}] if text else []

    return {"text": text, "paragraphs": paragraphs}
