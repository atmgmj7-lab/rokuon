"""
mlx-whisper によるローカル文字起こし

M1 Mac 上で API コスト 0 で音声をテキスト化。
"""
import os
from typing import Optional


def transcribe_with_mlx_whisper(
    audio_path: str,
    model_name: str = "mlx-community/whisper-small-ja",
) -> dict:
    """
    mlx-whisper で音声を文字起こし

    Returns:
        {"text": str, "segments": [{"start": float, "end": float, "text": str}, ...]}
    """
    try:
        from mlx_whisper import load_model, transcribe
    except ImportError:
        return {
            "text": "[mlx-whisper 未インストール] pip install mlx-whisper を実行してください",
            "segments": [],
        }

    model = os.getenv("MLX_WHISPER_MODEL", model_name)
    model_obj = load_model(model, path=None)

    result = transcribe(audio_path, path=model_obj, verbose=False)

    segments = []
    if isinstance(result, dict) and "segments" in result:
        for s in result["segments"]:
            segments.append({
                "start": s.get("start", 0),
                "end": s.get("end", 0),
                "text": s.get("text", "").strip(),
            })
        text = " ".join(s["text"] for s in segments if s["text"])
    elif isinstance(result, dict) and "text" in result:
        text = result["text"]
    elif isinstance(result, str):
        text = result
    else:
        text = str(result)

    return {"text": text, "segments": segments}
