"""Podcast show and episode management."""

import re
from datetime import UTC, datetime
from typing import List, Optional
from xml.etree.ElementTree import Element, SubElement, tostring

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from fastapi.responses import Response
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.permissions import CurrentUser, get_current_user, require_moderator
from app.models.episode import Episode
from app.models.show import Show
from app.schemas.episode import EpisodeCreate, EpisodeDetail, EpisodeList, EpisodeUpdate
from app.schemas.show import ShowCreate, ShowDetail, ShowList, ShowUpdate
from app.services import storage
from app.services.url_shortener import make_short_url

router = APIRouter(tags=["shows"])

# ── Shows ─────────────────────────────────────────────────────────────────────

@router.get("/shows/", response_model=List[ShowList])
async def list_shows(
    db: AsyncSession = Depends(get_db),
    current: CurrentUser = Depends(get_current_user),
) -> List[ShowList]:
    # Fetch shows with episode counts in a single query
    result = await db.execute(
        select(Show, func.count(Episode.id).label("episode_count"))
        .outerjoin(Episode, Episode.show_id == Show.id)
        .group_by(Show.id)
        .order_by(Show.title)
    )
    rows = result.all()
    return [_show_to_schema(row[0], episode_count=row[1]) for row in rows]


@router.post("/shows/", response_model=ShowDetail, status_code=status.HTTP_201_CREATED)
async def create_show(
    body: ShowCreate,
    db: AsyncSession = Depends(get_db),
    current: CurrentUser = Depends(require_moderator),
) -> ShowDetail:
    # Check slug uniqueness
    existing = await db.execute(select(Show).where(Show.slug == body.slug))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Slug already taken")

    show = Show(
        title=body.title,
        slug=body.slug,
        description=body.description,
        is_public=body.is_public,
        owner_id=current.user_id,
    )
    db.add(show)
    await db.commit()
    await db.refresh(show)
    return _show_to_schema(show)


@router.get("/shows/{slug}", response_model=ShowDetail)
async def get_show(
    slug: str,
    db: AsyncSession = Depends(get_db),
    current: CurrentUser = Depends(get_current_user),
) -> ShowDetail:
    show = await _get_show_or_404(slug, db)
    return _show_to_schema(show)


@router.patch("/shows/{slug}", response_model=ShowDetail)
async def update_show(
    slug: str,
    body: ShowUpdate,
    db: AsyncSession = Depends(get_db),
    current: CurrentUser = Depends(require_moderator),
) -> ShowDetail:
    show = await _get_show_or_404(slug, db)
    if body.title is not None:
        show.title = body.title
    if body.description is not None:
        show.description = body.description
    if body.is_public is not None:
        show.is_public = body.is_public
    await db.commit()
    await db.refresh(show)
    return _show_to_schema(show)


@router.post("/shows/{slug}/cover", response_model=ShowDetail)
async def upload_show_cover(
    slug: str,
    cover: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current: CurrentUser = Depends(require_moderator),
) -> ShowDetail:
    """Upload or replace the cover image for a show."""
    show = await _get_show_or_404(slug, db)

    content_type = cover.content_type or ""
    if not content_type.startswith("image/"):
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Image file required")

    image_data = await cover.read()
    ext = (cover.filename or "cover.jpg").rsplit(".", 1)[-1].lower()
    cover_key = f"shows/{show.id}/cover.{ext}"
    storage.upload_bytes(settings.MINIO_BUCKET_MEDIA, cover_key, image_data, content_type)

    show.cover_image_path = cover_key
    await db.commit()
    await db.refresh(show)
    return _show_to_schema(show)


@router.post("/episodes/{episode_id}/cover", response_model=EpisodeDetail)
async def upload_episode_cover(
    episode_id: int,
    cover: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current: CurrentUser = Depends(require_moderator),
) -> EpisodeDetail:
    """Upload or replace the cover image for an episode."""
    episode = await db.get(Episode, episode_id)
    if not episode:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Episode not found")

    content_type = cover.content_type or ""
    if not content_type.startswith("image/"):
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Image file required")

    image_data = await cover.read()
    ext = (cover.filename or "cover.jpg").rsplit(".", 1)[-1].lower()
    cover_key = f"episodes/{episode.show_id}/{episode.id}/cover.{ext}"
    storage.upload_bytes(settings.MINIO_BUCKET_MEDIA, cover_key, image_data, content_type)

    episode.cover_image_path = cover_key
    await db.commit()
    await db.refresh(episode)
    return _episode_detail(episode)


@router.delete("/shows/{slug}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_show(
    slug: str,
    db: AsyncSession = Depends(get_db),
    current: CurrentUser = Depends(require_moderator),
) -> None:
    show = await _get_show_or_404(slug, db)
    await db.delete(show)
    await db.commit()


# ── RSS Feed ──────────────────────────────────────────────────────────────────

@router.get("/shows/{slug}/rss", response_class=Response, include_in_schema=False)
async def show_rss(slug: str, request: Request, db: AsyncSession = Depends(get_db)) -> Response:
    show = await _get_show_or_404(slug, db)
    result = await db.execute(
        select(Episode)
        .where(Episode.show_id == show.id, Episode.status == "published")
        .order_by(Episode.published_at.desc())
        .limit(100)
    )
    episodes = result.scalars().all()

    rss = Element("rss", version="2.0")
    rss.set("xmlns:itunes", "http://www.itunes.com/dtds/podcast-1.0.dtd")
    channel = SubElement(rss, "channel")
    SubElement(channel, "title").text = show.title
    SubElement(channel, "description").text = show.description or ""
    SubElement(channel, "link").text = f"{settings.APP_BASE_URL}/podcasts/{show.slug}"
    SubElement(channel, "language").text = "de"

    for ep in episodes:
        item = SubElement(channel, "item")
        SubElement(item, "title").text = ep.title
        SubElement(item, "description").text = ep.description or ""
        if ep.published_at:
            SubElement(item, "pubDate").text = ep.published_at.strftime("%a, %d %b %Y %H:%M:%S +0000")
        if ep.audio_path:
            audio_url = storage.get_presigned_download_url(settings.MINIO_BUCKET_MEDIA, ep.audio_path, 1440)
            enc = SubElement(item, "enclosure")
            enc.set("url", audio_url)
            enc.set("type", "audio/mpeg")
            if ep.file_size:
                enc.set("length", str(ep.file_size))
        if ep.duration_sec:
            SubElement(item, "itunes:duration").text = str(ep.duration_sec)

    xml_bytes = tostring(rss, encoding="utf-8", xml_declaration=True)
    return Response(content=xml_bytes, media_type="application/rss+xml; charset=utf-8")


# ── Episodes ──────────────────────────────────────────────────────────────────

@router.get("/shows/{slug}/episodes/", response_model=List[EpisodeList])
async def list_episodes(
    slug: str,
    db: AsyncSession = Depends(get_db),
    current: CurrentUser = Depends(get_current_user),
) -> List[EpisodeList]:
    show = await _get_show_or_404(slug, db)
    result = await db.execute(
        select(Episode).where(Episode.show_id == show.id).order_by(Episode.created_at.desc())
    )
    return [EpisodeList.model_validate(ep) for ep in result.scalars()]


@router.post("/shows/{slug}/episodes/", response_model=EpisodeDetail, status_code=status.HTTP_201_CREATED)
async def upload_episode(
    slug: str,
    title: str = Form(...),
    description: Optional[str] = Form(None),
    audio: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current: CurrentUser = Depends(require_moderator),
    request: Request = None,
) -> EpisodeDetail:
    show = await _get_show_or_404(slug, db)

    # Validate MIME type
    content_type = audio.content_type or ""
    if not any(ct in content_type for ct in ("audio/", "video/mp4")):
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Audio file required")

    ep_slug = _slugify(title)
    # Ensure slug uniqueness within show
    base_slug = ep_slug
    counter = 1
    while True:
        exists = await db.execute(
            select(Episode).where(Episode.show_id == show.id, Episode.slug == ep_slug)
        )
        if not exists.scalar_one_or_none():
            break
        ep_slug = f"{base_slug}-{counter}"
        counter += 1

    episode = Episode(
        show_id=show.id,
        title=title,
        slug=ep_slug,
        description=description,
        transcript_status="pending",
        status="processing",
        created_by=current.user_id,
    )
    db.add(episode)
    await db.flush()

    # Upload audio to MinIO
    audio_data = await audio.read()
    audio_key = f"podcasts/{show.id}/{episode.id}/original.mp3"
    storage.upload_bytes(settings.MINIO_BUCKET_MEDIA, audio_key, audio_data, content_type)
    episode.audio_path = audio_key
    episode.file_size = len(audio_data)
    await db.commit()

    # Queue transcription task
    from arq import create_pool
    from arq.connections import RedisSettings
    redis = await create_pool(RedisSettings.from_dsn(settings.REDIS_URL))
    await redis.enqueue_job("transcribe_episode", episode.id)
    await redis.close()

    return _episode_detail(episode)


@router.get("/episodes/{episode_id}", response_model=EpisodeDetail)
async def get_episode(
    episode_id: int,
    db: AsyncSession = Depends(get_db),
    current: CurrentUser = Depends(get_current_user),
) -> EpisodeDetail:
    episode = await db.get(Episode, episode_id)
    if not episode:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Episode not found")
    return _episode_detail(episode)


@router.patch("/episodes/{episode_id}", response_model=EpisodeDetail)
async def update_episode(
    episode_id: int,
    body: EpisodeUpdate,
    db: AsyncSession = Depends(get_db),
    current: CurrentUser = Depends(require_moderator),
) -> EpisodeDetail:
    episode = await db.get(Episode, episode_id)
    if not episode:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Episode not found")
    if body.title is not None:
        episode.title = body.title
    if body.description is not None:
        episode.description = body.description
    if body.status is not None:
        episode.status = body.status
        if body.status == "published" and not episode.published_at:
            episode.published_at = datetime.now(UTC)
    await db.commit()
    return _episode_detail(episode)


@router.delete("/episodes/{episode_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_episode(
    episode_id: int,
    db: AsyncSession = Depends(get_db),
    current: CurrentUser = Depends(require_moderator),
) -> None:
    episode = await db.get(Episode, episode_id)
    if not episode:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Episode not found")
    await db.delete(episode)
    await db.commit()


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _get_show_or_404(slug: str, db: AsyncSession) -> Show:
    result = await db.execute(select(Show).where(Show.slug == slug))
    show = result.scalar_one_or_none()
    if not show:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Show not found")
    return show


def _show_to_schema(show: Show, episode_count: int = 0) -> ShowDetail:
    cover_url = None
    if show.cover_image_path:
        cover_url = storage.get_presigned_download_url(
            settings.MINIO_BUCKET_MEDIA, show.cover_image_path
        )
    return ShowDetail(
        id=show.id,
        title=show.title,
        slug=show.slug,
        description=show.description,
        cover_image_url=cover_url,
        is_public=show.is_public,
        episode_count=episode_count,
        owner_id=show.owner_id,
        created_at=show.created_at,
        updated_at=show.updated_at,
    )


def _episode_detail(episode: Episode) -> EpisodeDetail:
    audio_url = None
    if episode.audio_path:
        audio_url = storage.get_presigned_download_url(
            settings.MINIO_BUCKET_MEDIA, episode.audio_path
        )
    cover_url = None
    if getattr(episode, "cover_image_path", None):
        cover_url = storage.get_presigned_download_url(
            settings.MINIO_BUCKET_MEDIA, episode.cover_image_path
        )
    return EpisodeDetail(
        id=episode.id,
        show_id=episode.show_id,
        title=episode.title,
        slug=episode.slug,
        description=episode.description,
        duration_sec=episode.duration_sec,
        audio_url=audio_url,
        cover_image_url=cover_url,
        transcript_status=episode.transcript_status,
        transcript_json=episode.transcript_json,
        summary=episode.summary,
        chapters_json=episode.chapters_json,
        status=episode.status,
        published_at=episode.published_at,
        created_at=episode.created_at,
        updated_at=episode.updated_at,
    )


def _slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[äÄ]", "ae", text)
    text = re.sub(r"[öÖ]", "oe", text)
    text = re.sub(r"[üÜ]", "ue", text)
    text = re.sub(r"[ß]", "ss", text)
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    text = re.sub(r"-+", "-", text)
    return text[:200].strip("-")
