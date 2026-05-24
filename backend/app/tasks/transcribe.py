"""ARQ background tasks: transcription pipeline for episodes and videos."""

import os
import tempfile

import structlog
from arq import ArqRedis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.episode import Episode
from app.models.video import Video
from app.services import ffmpeg, ollama, storage, transcription

log = structlog.get_logger(__name__)


async def transcribe_episode(ctx: dict, episode_id: int) -> None:
    """
    ARQ task: download episode audio, transcribe, enrich with Ollama.
    Updates episode record with transcript_json, summary, chapters, status.
    """
    async with AsyncSessionLocal() as db:
        episode = await db.get(Episode, episode_id)
        if not episode:
            log.warning("transcribe_episode.not_found", episode_id=episode_id)
            return

        episode.transcript_status = "processing"
        await db.commit()

        try:
            with tempfile.TemporaryDirectory() as tmpdir:
                audio_file = os.path.join(tmpdir, "audio.mp3")
                storage.download_file(settings.MINIO_BUCKET_MEDIA, episode.audio_path, audio_file)

                result = transcription.transcribe_audio_file(audio_file)

                episode.transcript_json = result
                episode.transcript_status = "done"
                await db.commit()

            # AI enrichment (non-blocking failures)
            try:
                summary = ollama.generate_summary(result["text"], episode.title)
                chapters = ollama.generate_chapters(result["segments"], episode.title)
                episode.summary = summary
                episode.chapters_json = chapters
                await db.commit()
            except Exception as exc:
                log.warning("transcribe_episode.ollama_failed", error=str(exc))

            log.info("transcribe_episode.done", episode_id=episode_id)

        except Exception as exc:
            episode.transcript_status = "error"
            await db.commit()
            log.error("transcribe_episode.failed", episode_id=episode_id, error=str(exc))
            raise


async def transcode_and_transcribe_video(ctx: dict, video_id: int) -> None:
    """
    ARQ task: full video processing pipeline.
    1. Download original from MinIO
    2. Extract thumbnail
    3. Transcode to HLS
    4. Extract audio + transcribe
    5. Generate VTT subtitles
    6. Upload all artifacts back to MinIO
    7. Update video record
    """
    async with AsyncSessionLocal() as db:
        video = await db.get(Video, video_id)
        if not video:
            log.warning("transcode_video.not_found", video_id=video_id)
            return

        video.transcode_status = "processing"
        video.status = "processing"
        await db.commit()

        try:
            with tempfile.TemporaryDirectory() as tmpdir:
                original_file = os.path.join(tmpdir, "original.mp4")
                storage.download_file(
                    settings.MINIO_BUCKET_MEDIA, video.original_path, original_file
                )

                # ── Thumbnail ─────────────────────────────────────────────
                thumb_file = os.path.join(tmpdir, "thumb.jpg")
                ffmpeg.extract_thumbnail(original_file, thumb_file)
                thumb_key = f"videos/{video_id}/thumb.jpg"
                storage.upload_file(settings.MINIO_BUCKET_MEDIA, thumb_key, thumb_file, "image/jpeg")
                video.thumbnail_path = thumb_key

                # ── HLS Transcoding ───────────────────────────────────────
                hls_dir = os.path.join(tmpdir, "hls")
                master_path = ffmpeg.transcode_to_hls(original_file, hls_dir)
                hls_prefix = f"videos/{video_id}/hls"

                # Upload all HLS files
                for fname in os.listdir(hls_dir):
                    storage.upload_file(
                        settings.MINIO_BUCKET_HLS,
                        f"{hls_prefix}/{fname}",
                        os.path.join(hls_dir, fname),
                        "application/vnd.apple.mpegurl" if fname.endswith(".m3u8") else "video/mp2t",
                    )
                video.hls_path = f"{hls_prefix}/master.m3u8"
                video.duration_sec = ffmpeg.get_duration(original_file)
                video.transcode_status = "done"
                await db.commit()

                # ── Audio Extraction + Transcription ──────────────────────
                video.transcript_status = "processing"
                await db.commit()

                audio_file = os.path.join(tmpdir, "audio.wav")
                ffmpeg.extract_audio(original_file, audio_file)
                transcript_result = transcription.transcribe_audio_file(audio_file)

                # Generate VTT
                vtt_content = transcription.segments_to_vtt(transcript_result["segments"])
                vtt_key = f"videos/{video_id}/subtitles.vtt"
                storage.upload_bytes(
                    settings.MINIO_BUCKET_MEDIA, vtt_key,
                    vtt_content.encode("utf-8"), "text/vtt"
                )
                video.subtitles_vtt_path = vtt_key
                video.transcript_status = "done"
                video.status = "published"
                await db.commit()

            log.info("transcode_video.done", video_id=video_id)

        except Exception as exc:
            video.transcode_status = "error"
            video.transcript_status = "error"
            video.status = "error"
            await db.commit()
            log.error("transcode_video.failed", video_id=video_id, error=str(exc))
            raise


async def merge_recording_chunks(ctx: dict, video_id: int) -> None:
    """
    ARQ task: concatenate uploaded WebM chunks into a single video,
    then hand off to the standard transcode pipeline.
    """
    async with AsyncSessionLocal() as db:
        video = await db.get(Video, video_id)
        if not video:
            return

        with tempfile.TemporaryDirectory() as tmpdir:
            prefix = f"recordings/{video_id}/"
            client = storage._get_client()

            # Download all chunks
            chunk_files = []
            objects = list(client.list_objects(settings.MINIO_BUCKET_RECORDINGS, prefix=prefix))
            for i, obj in enumerate(sorted(objects, key=lambda o: o.object_name)):
                chunk_path = os.path.join(tmpdir, f"chunk_{i:04d}.webm")
                storage.download_file(settings.MINIO_BUCKET_RECORDINGS, obj.object_name, chunk_path)
                chunk_files.append(chunk_path)

            if not chunk_files:
                log.warning("merge_recording.no_chunks", video_id=video_id)
                return

            merged_path = os.path.join(tmpdir, "merged.mp4")
            ffmpeg.concat_webm_chunks(chunk_files, merged_path)

            # Upload merged file as the original
            original_key = f"videos/{video_id}/original.mp4"
            storage.upload_file(settings.MINIO_BUCKET_MEDIA, original_key, merged_path, "video/mp4")
            video.original_path = original_key
            await db.commit()

        # Kick off standard pipeline
        await ctx["redis"].enqueue_job("transcode_and_transcribe_video", video_id)
        log.info("merge_recording.done", video_id=video_id)
