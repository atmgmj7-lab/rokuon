"""
OpenAI Whisper API による文字起こし
"""
import tempfile
import os
from fastapi import APIRouter, UploadFile, File, HTTPException
from services.openai_whisper_service import transcribe_with_openai_whisper

router = APIRouter()


@router.post("")
async def transcribe_audio(file: UploadFile = File(...)):
    """音声ファイルを OpenAI Whisper API で文字起こし"""
    if not file.filename or not file.filename.lower().endswith((".mp3", ".m4a", ".wav", ".webm", ".mp4")):
        raise HTTPException(status_code=400, detail="音声ファイル（mp3/m4a/wav/webm）を指定してください")

    content = await file.read()
    with tempfile.NamedTemporaryFile(suffix=os.path.splitext(file.filename)[1], delete=False) as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        result = transcribe_with_openai_whisper(tmp_path)
        paragraphs = result.get("paragraphs", [])
        duration = max((p.get("endTime", 0) for p in paragraphs), default=0) if paragraphs else 0
        return {
            "success": True,
            "text": result.get("text", ""),
            "segments": paragraphs,
            "duration": duration,
        }
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
