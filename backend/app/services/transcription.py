"""faster-whisper transcription service."""

import json
import os
import tempfile
from typing import Optional

import structlog

from app.core.config import settings

log = structlog.get_logger(__name__)


def transcribe_audio_file(
    file_path: str,
    language: Optional[str] = None,
) -> dict:
    """
    Transcribe an audio/video file using faster-whisper.

    Returns a dict with:
      - language: detected or specified language
      - segments: list of {start, end, text}
      - text: full plain text
    """
    # Import here so the model is loaded lazily (expensive on startup)
    from faster_whisper import WhisperModel  # type: ignore

    log.info("transcription.start", file=file_path, model=settings.WHISPER_MODEL)

    model = WhisperModel(
        settings.WHISPER_MODEL,
        device=settings.WHISPER_DEVICE,
        compute_type=settings.WHISPER_COMPUTE_TYPE,
    )

    segments_iter, info = model.transcribe(
        file_path,
        language=language or settings.WHISPER_LANGUAGE or None,
        word_timestamps=False,
        vad_filter=True,
    )

    segments = []
    full_text_parts = []
    for seg in segments_iter:
        segments.append({"start": round(seg.start, 2), "end": round(seg.end, 2), "text": seg.text.strip()})
        full_text_parts.append(seg.text.strip())

    result = {
        "language": info.language,
        "language_probability": round(info.language_probability, 3),
        "segments": segments,
        "text": " ".join(full_text_parts),
    }

    log.info(
        "transcription.complete",
        language=info.language,
        segment_count=len(segments),
    )
    return result


def segments_to_vtt(segments: list[dict]) -> str:
    """Convert transcript segments to WebVTT subtitle format."""
    lines = ["WEBVTT", ""]
    for i, seg in enumerate(segments, 1):
        start = _format_vtt_time(seg["start"])
        end = _format_vtt_time(seg["end"])
        lines.append(str(i))
        lines.append(f"{start} --> {end}")
        lines.append(seg["text"])
        lines.append("")
    return "\n".join(lines)


def segments_to_srt(segments: list[dict]) -> str:
    """Convert transcript segments to SRT subtitle format."""
    lines = []
    for i, seg in enumerate(segments, 1):
        start = _format_srt_time(seg["start"])
        end = _format_srt_time(seg["end"])
        lines.append(str(i))
        lines.append(f"{start} --> {end}")
        lines.append(seg["text"])
        lines.append("")
    return "\n".join(lines)


def _format_vtt_time(seconds: float) -> str:
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = seconds % 60
    return f"{h:02d}:{m:02d}:{s:06.3f}"


def _format_srt_time(seconds: float) -> str:
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int((seconds - int(seconds)) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"
