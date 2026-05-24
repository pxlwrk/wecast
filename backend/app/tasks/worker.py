"""ARQ worker configuration. Run with: arq app.tasks.worker.WorkerSettings"""

from arq.connections import RedisSettings

from app.core.config import settings
from app.tasks.transcribe import (
    merge_recording_chunks,
    transcribe_episode,
    transcode_and_transcribe_video,
)


class WorkerSettings:
    functions = [
        transcribe_episode,
        transcode_and_transcribe_video,
        merge_recording_chunks,
    ]
    redis_settings = RedisSettings.from_dsn(settings.REDIS_URL)
    max_jobs = 2  # Limit concurrency (transcription is CPU-intensive)
    job_timeout = 3600  # 1 hour max per job
    keep_result = 86400  # Keep job results for 24 hours
