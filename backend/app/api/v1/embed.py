"""Public embed metadata endpoint (no auth required for embed players)."""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.models.episode import Episode
from app.models.video import Video
from app.services import storage

router = APIRouter(prefix="/embed", tags=["embed"])


class EmbedMeta(BaseModel):
    type: str
    id: int
    title: str
    description: str | None
    media_url: str | None
    thumbnail_url: str | None
    subtitles_url: str | None
    duration_sec: int | None
    embed_url: str


@router.get("/episode/{episode_id}", response_model=EmbedMeta)
async def embed_episode(episode_id: int, db: AsyncSession = Depends(get_db)) -> EmbedMeta:
    episode = await db.get(Episode, episode_id)
    if not episode or episode.status != "published":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Episode not found")

    audio_url = None
    if episode.audio_path:
        audio_url = storage.get_presigned_download_url(
            settings.MINIO_BUCKET_MEDIA, episode.audio_path, expires_minutes=480
        )

    return EmbedMeta(
        type="episode",
        id=episode.id,
        title=episode.title,
        description=episode.description,
        media_url=audio_url,
        thumbnail_url=None,
        subtitles_url=None,
        duration_sec=episode.duration_sec,
        embed_url=f"{settings.APP_BASE_URL}/embed/episode/{episode_id}",
    )


@router.get("/video/{video_id}", response_model=EmbedMeta)
async def embed_video(video_id: int, db: AsyncSession = Depends(get_db)) -> EmbedMeta:
    video = await db.get(Video, video_id)
    if not video or video.status != "published":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")

    hls_url = thumb_url = sub_url = None
    if video.hls_path:
        hls_url = storage.get_presigned_download_url(settings.MINIO_BUCKET_HLS, video.hls_path, 480)
    if video.thumbnail_path:
        thumb_url = storage.get_presigned_download_url(settings.MINIO_BUCKET_MEDIA, video.thumbnail_path, 480)
    if video.subtitles_vtt_path:
        sub_url = storage.get_presigned_download_url(settings.MINIO_BUCKET_MEDIA, video.subtitles_vtt_path, 480)

    return EmbedMeta(
        type="video",
        id=video.id,
        title=video.title,
        description=video.description,
        media_url=hls_url,
        thumbnail_url=thumb_url,
        subtitles_url=sub_url,
        duration_sec=video.duration_sec,
        embed_url=f"{settings.APP_BASE_URL}/embed/video/{video_id}",
    )
