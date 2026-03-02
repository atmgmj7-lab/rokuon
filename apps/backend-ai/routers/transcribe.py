"""
mlx-whisper によるローカル文字起こし

APIコスト0で録音をテキスト化。
"""
import tempfile
import os
from fastapi import APIRouter, UploadFile, File, HTTPException

router = APIRouter()


@router.post("")
async def transcribe_audio(file: UploadFile = File(...)):
    """音声ファイルを mlx-whisper で文字起こし"""
    try:
        from services.mlx_whisper_service import transcribe_with_mlx_whisper
    except ImportError as e:
        raise HTTPException(
            status_code=503,
            detail=f"mlx-whisper が利用できません。pip install mlx-whisper を実行してください: {e}",
        )

    if not file.filename or not file.filename.lower().endswith((".mp3", ".m4a", ".wav", ".webm", ".mp4")):
        raise HTTPException(status_code=400, detail="音声ファイル（mp3/m4a/wav/webm）を指定してください")

    content = await file.read()
    with tempfile.NamedTemporaryFile(suffix=os.path.splitext(file.filename)[1], delete=False) as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        result = transcribe_with_mlx_whisper(tmp_path)
        segments = result.get("segments", [])
        duration = max((s.get("end", 0) for s in segments), default=0) if segments else 0
        return {
            "success": True,
            "text": result.get("text", ""),
            "segments": segments,
            "duration": duration,
        }
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
