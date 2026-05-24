"""FFmpeg wrapper for media processing (HLS, thumbnails, audio normalisation)."""

import asyncio
import os
import subprocess
import tempfile
from pathlib import Path

import structlog

log = structlog.get_logger(__name__)


def _run(cmd: list[str]) -> subprocess.CompletedProcess:
    """Run an FFmpeg command and raise on non-zero exit."""
    log.debug("ffmpeg.run", cmd=" ".join(cmd))
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        log.error("ffmpeg.error", stderr=result.stderr)
        raise RuntimeError(f"FFmpeg failed: {result.stderr[-500:]}")
    return result


def extract_thumbnail(input_path: str, output_path: str, time_secs: int = 5) -> str:
    """Extract a single frame as JPEG thumbnail."""
    _run([
        "ffmpeg", "-y",
        "-ss", str(time_secs),
        "-i", input_path,
        "-vframes", "1",
        "-vf", "scale=1280:-1",
        "-q:v", "2",
        output_path,
    ])
    return output_path


def extract_audio(input_path: str, output_path: str) -> str:
    """Extract audio track from a video file (for transcription)."""
    _run([
        "ffmpeg", "-y",
        "-i", input_path,
        "-vn",
        "-acodec", "pcm_s16le",
        "-ar", "16000",
        "-ac", "1",
        output_path,
    ])
    return output_path


def normalize_audio(input_path: str, output_path: str) -> str:
    """Normalize audio loudness to -16 LUFS (podcast standard) and encode to MP3."""
    _run([
        "ffmpeg", "-y",
        "-i", input_path,
        "-af", "loudnorm=I=-16:TP=-1.5:LRA=11",
        "-c:a", "libmp3lame",
        "-b:a", "128k",
        output_path,
    ])
    return output_path


def transcode_to_hls(input_path: str, output_dir: str) -> str:
    """
    Transcode a video to HLS with multiple quality levels.
    Generates master.m3u8 + segment files in output_dir.
    Returns the path to master.m3u8.
    """
    os.makedirs(output_dir, exist_ok=True)
    master_playlist = os.path.join(output_dir, "master.m3u8")

    # Multi-bitrate HLS: 360p, 720p, 1080p
    cmd = [
        "ffmpeg", "-y",
        "-i", input_path,
        # 360p
        "-map", "0:v", "-map", "0:a",
        "-c:v:0", "libx264", "-b:v:0", "800k", "-maxrate:v:0", "856k",
        "-bufsize:v:0", "1200k", "-vf:v:0", "scale=-2:360",
        # 720p
        "-map", "0:v", "-map", "0:a",
        "-c:v:1", "libx264", "-b:v:1", "2800k", "-maxrate:v:1", "2996k",
        "-bufsize:v:1", "4200k", "-vf:v:1", "scale=-2:720",
        # 1080p
        "-map", "0:v", "-map", "0:a",
        "-c:v:2", "libx264", "-b:v:2", "5000k", "-maxrate:v:2", "5350k",
        "-bufsize:v:2", "7500k", "-vf:v:2", "scale=-2:1080",
        # Audio (all variants)
        "-c:a", "aac", "-b:a", "128k",
        "-var_stream_map", "v:0,a:0 v:1,a:1 v:2,a:2",
        "-master_pl_name", "master.m3u8",
        "-hls_time", "6",
        "-hls_list_size", "0",
        "-hls_segment_filename", os.path.join(output_dir, "stream_%v_%03d.ts"),
        "-f", "hls",
        os.path.join(output_dir, "stream_%v.m3u8"),
    ]
    _run(cmd)
    return master_playlist


def get_duration(input_path: str) -> int:
    """Return media duration in whole seconds."""
    result = subprocess.run(
        [
            "ffprobe", "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            input_path,
        ],
        capture_output=True,
        text=True,
    )
    import json
    info = json.loads(result.stdout)
    return int(float(info["format"]["duration"]))


def concat_webm_chunks(chunk_paths: list[str], output_path: str) -> str:
    """Concatenate multiple WebM chunks (from screen recorder) into one file."""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as f:
        for path in sorted(chunk_paths):
            f.write(f"file '{path}'\n")
        list_file = f.name

    try:
        _run([
            "ffmpeg", "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", list_file,
            "-c", "copy",
            output_path,
        ])
    finally:
        os.unlink(list_file)

    return output_path
