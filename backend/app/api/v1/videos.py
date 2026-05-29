"""Video upload, management, and presigned upload endpoints."""

import re
import secrets
from datetime import UTC, datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.permissions import CurrentUser, get_current_user, require_moderator
from app.models.video import Video
from app.schemas.video import PresignedUploadResponse, VideoDetail, VideoList, VideoUpdate
from app.services import storage

router = APIRouter(prefix="/videos", tags=["videos"])


@router.get("/", response_model=List[VideoList])
@router.get("", response_model=List[VideoList], include_in_schema=False)
async def list_videos(
    db: AsyncSession = Depends(get_db),
    current: CurrentUser = Depends(get_current_user),
) -> List[VideoList]:
    result = await db.execute(select(Video).order_by(Video.created_at.desc()))
    videos = result.scalars().all()
    visible = [
        v for v in videos
        if current.is_visible_in_list(
            getattr(v, "visibility", "internal"),
            getattr(v, "allowed_group_dns", None),
            v.owner_id,
        )
    ]
    return [_video_list(v) for v in visible]


@router.post("/upload-url", response_model=PresignedUploadResponse, status_code=status.HTTP_201_CREATED,
             summary="Get presigned URL for direct browser-to-MinIO upload")
async def get_upload_url(
    title: str,
    description: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current: CurrentUser = Depends(require_moderator),
) -> PresignedUploadResponse:
    slug = _make_unique_slug(title)
    video = Video(
        title=title,
        slug=slug,
        description=description,
        owner_id=current.user_id,
        status="uploading",
        transcode_status="pending",
        transcript_status="pending",
    )
    db.add(video)
    await db.flush()

    object_key = f"videos/{video.id}/original.mp4"
    video.original_path = object_key
    await db.commit()

    upload_url = storage.get_presigned_upload_url(
        settings.MINIO_BUCKET_MEDIA, object_key, expires_hours=2
    )

    return PresignedUploadResponse(
        upload_url=upload_url,
        video_id=video.id,
        object_key=object_key,
        expires_in=7200,
    )


@router.post("/{video_id}/process", status_code=status.HTTP_202_ACCEPTED,
             summary="Trigger processing after presigned upload completes")
async def trigger_processing(
    video_id: int,
    db: AsyncSession = Depends(get_db),
    current: CurrentUser = Depends(require_moderator),
) -> dict:
    video = await _get_video_or_404(video_id, db)
    if video.status not in ("uploading", "draft"):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Video already being processed")

    video.status = "processing"
    await db.commit()

    from arq import create_pool
    from arq.connections import RedisSettings
    redis = await create_pool(RedisSettings.from_dsn(settings.REDIS_URL))
    await redis.enqueue_job("transcode_and_transcribe_video", video_id)
    await redis.close()

    return {"status": "queued", "video_id": video_id}


@router.get("/{video_id}", response_model=VideoDetail)
async def get_video(
    video_id: int,
    db: AsyncSession = Depends(get_db),
    current: CurrentUser = Depends(get_current_user),
) -> VideoDetail:
    return _video_detail(await _get_video_or_404(video_id, db))


@router.patch("/{video_id}", response_model=VideoDetail)
async def update_video(
    video_id: int,
    body: VideoUpdate,
    db: AsyncSession = Depends(get_db),
    current: CurrentUser = Depends(require_moderator),
) -> VideoDetail:
    video = await _get_video_or_404(video_id, db)
    if body.title is not None:
        video.title = body.title
    if body.description is not None:
        video.description = body.description
    if body.status is not None:
        video.status = body.status
        if body.status == "published" and not video.published_at:
            video.published_at = datetime.now(UTC)
    if body.visibility is not None:
        video.visibility = body.visibility
    if body.allowed_group_dns is not None:
        video.allowed_group_dns = body.allowed_group_dns
    await db.commit()
    await db.refresh(video)
    return _video_detail(video)


@router.delete("/{video_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_video(
    video_id: int,
    db: AsyncSession = Depends(get_db),
    current: CurrentUser = Depends(require_moderator),
) -> None:
    video = await _get_video_or_404(video_id, db)
    await db.delete(video)
    await db.commit()


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _get_video_or_404(video_id: int, db: AsyncSession) -> Video:
    video = await db.get(Video, video_id)
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")
    return video


def _video_list(v: Video) -> VideoList:
    thumb_url = None
    if v.thumbnail_path:
        thumb_url = storage.get_presigned_download_url(settings.MINIO_BUCKET_MEDIA, v.thumbnail_path)
    return VideoList(
        id=v.id, title=v.title, slug=v.slug, description=v.description,
        thumbnail_url=thumb_url, duration_sec=v.duration_sec,
        transcode_status=v.transcode_status, transcript_status=v.transcript_status,
        status=v.status, is_recording=v.is_recording,
        published_at=v.published_at, created_at=v.created_at,
        visibility=getattr(v, "visibility", "internal"),
        allowed_group_dns=getattr(v, "allowed_group_dns", None),
    )


def _video_detail(v: Video) -> VideoDetail:
    thumb_url = hls_url = sub_url = None
    if v.thumbnail_path:
        thumb_url = storage.get_presigned_download_url(settings.MINIO_BUCKET_MEDIA, v.thumbnail_path)
    if v.hls_path:
        hls_url = storage.get_presigned_download_url(settings.MINIO_BUCKET_HLS, v.hls_path)
    if v.subtitles_vtt_path:
        sub_url = storage.get_presigned_download_url(settings.MINIO_BUCKET_MEDIA, v.subtitles_vtt_path)
    return VideoDetail(
        id=v.id, title=v.title, slug=v.slug, description=v.description,
        thumbnail_url=thumb_url, hls_url=hls_url, subtitles_url=sub_url,
        duration_sec=v.duration_sec, transcode_status=v.transcode_status,
        transcript_status=v.transcript_status, status=v.status,
        is_recording=v.is_recording, owner_id=v.owner_id,
        published_at=v.published_at, created_at=v.created_at, updated_at=v.updated_at,
        visibility=getattr(v, "visibility", "internal"),
        allowed_group_dns=getattr(v, "allowed_group_dns", None),
    )


def _make_unique_slug(title: str) -> str:
    slug = re.sub(r"[^\w\s-]", "", title.lower()).strip()
    slug = re.sub(r"[\s_]+", "-", slug)[:100]
    return f"{slug}-{secrets.token_hex(4)}"
