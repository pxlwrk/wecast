"""Public API endpoints - no authentication required."""

from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.models.episode import Episode
from app.models.show import Show
from app.models.video import Video
from app.services import storage

router = APIRouter(prefix="/public", tags=["public"])


class PublicVideo(BaseModel):
    id: int
    title: str
    description: Optional[str]
    thumbnail_url: Optional[str]
    duration_sec: Optional[int]
    published_at: Optional[str]


class PublicShow(BaseModel):
    id: int
    title: str
    slug: str
    description: Optional[str]
    cover_image_url: Optional[str]
    episode_count: int


class FeaturedResponse(BaseModel):
    videos: list[PublicVideo]
    shows: list[PublicShow]


@router.get("/featured", response_model=FeaturedResponse)
async def get_featured(db: AsyncSession = Depends(get_db)) -> FeaturedResponse:
    """
    Returns publicly visible featured videos and shows.
    No authentication required.
    """
    # Public published videos
    v_result = await db.execute(
        select(Video)
        .where(Video.visibility == "public", Video.status == "published")
        .order_by(Video.published_at.desc().nullslast(), Video.created_at.desc())
        .limit(8)
    )
    videos = v_result.scalars().all()

    # Public shows with episode counts
    s_result = await db.execute(
        select(Show, func.count(Episode.id).label("ep_count"))
        .outerjoin(Episode, Episode.show_id == Show.id)
        .where(Show.visibility == "public")
        .group_by(Show.id)
        .order_by(func.count(Episode.id).desc(), Show.title)
        .limit(8)
    )
    show_rows = s_result.all()

    def _v(v: Video) -> PublicVideo:
        thumb = None
        if v.thumbnail_path:
            thumb = storage.get_presigned_download_url(settings.MINIO_BUCKET_MEDIA, v.thumbnail_path)
        return PublicVideo(
            id=v.id,
            title=v.title,
            description=v.description,
            thumbnail_url=thumb,
            duration_sec=v.duration_sec,
            published_at=v.published_at.isoformat() if v.published_at else None,
        )

    def _s(show: Show, ep_count: int) -> PublicShow:
        cover = None
        if show.cover_image_path:
            cover = storage.get_presigned_download_url(settings.MINIO_BUCKET_MEDIA, show.cover_image_path)
        return PublicShow(
            id=show.id,
            title=show.title,
            slug=show.slug,
            description=show.description,
            cover_image_url=cover,
            episode_count=ep_count,
        )

    return FeaturedResponse(
        videos=[_v(v) for v in videos],
        shows=[_s(row[0], row[1]) for row in show_rows],
    )
