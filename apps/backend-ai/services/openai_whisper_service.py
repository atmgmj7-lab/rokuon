"""
OpenAI Whisper API による文字起こし
"""
import os
import openai


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

    paragraphs = []
    if hasattr(result, "segments") and result.segments:
        for seg in result.segments:
            paragraphs.append({
                "type": "paragraph",
                "text": seg.text.strip(),
                "startTime": seg.start,
                "endTime": seg.end,
            })
        text = " ".join(p["text"] for p in paragraphs if p["text"])
    else:
        text = result.text if hasattr(result, "text") else ""

    return {"text": text, "paragraphs": paragraphs}
