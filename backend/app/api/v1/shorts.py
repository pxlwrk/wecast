"""Short URL management."""

from datetime import UTC, datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.permissions import CurrentUser, get_current_user
from app.models.short_url import ShortUrl
from app.schemas.short_url import ShortUrlCreate, ShortUrlResponse
from app.services.url_shortener import encode, make_short_url

router = APIRouter(tags=["short-urls"])


@router.post("/shorts/", response_model=ShortUrlResponse, status_code=status.HTTP_201_CREATED)
@router.post("/shorts", response_model=ShortUrlResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
async def create_short_url(
    body: ShortUrlCreate,
    db: AsyncSession = Depends(get_db),
    current: CurrentUser = Depends(get_current_user),
) -> ShortUrlResponse:
    # Check vanity slug uniqueness
    if body.vanity_slug:
        existing = await db.execute(select(ShortUrl).where(ShortUrl.vanity_slug == body.vanity_slug))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Vanity slug already taken")

    short = ShortUrl(
        code="tmp",  # will be updated after flush
        target_type=body.target_type,
        target_id=body.target_id,
        vanity_slug=body.vanity_slug,
        created_by=current.user_id,
    )
    db.add(short)
    await db.flush()

    # Generate Base62 code from auto-incremented ID
    short.code = encode(short.id)
    await db.commit()

    return _to_schema(short)


@router.get("/shorts/", response_model=List[ShortUrlResponse])
@router.get("/shorts", response_model=List[ShortUrlResponse], include_in_schema=False)
async def list_short_urls(
    db: AsyncSession = Depends(get_db),
    current: CurrentUser = Depends(get_current_user),
) -> List[ShortUrlResponse]:
    result = await db.execute(select(ShortUrl).order_by(ShortUrl.created_at.desc()))
    return [_to_schema(s) for s in result.scalars()]


@router.get("/s/{code}")
async def redirect_short_url(code: str, db: AsyncSession = Depends(get_db)) -> RedirectResponse:
    # Try vanity slug first, then code
    result = await db.execute(
        select(ShortUrl).where(
            (ShortUrl.vanity_slug == code) | (ShortUrl.code == code)
        )
    )
    short = result.scalar_one_or_none()
    if not short:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Short URL not found")

    short.visit_count += 1
    short.last_visited_at = datetime.now(UTC)
    await db.commit()

    # Build destination URL
    if short.target_type == "episode":
        dest = f"{settings.APP_BASE_URL}/podcasts/episode/{short.target_id}"
    else:
        dest = f"{settings.APP_BASE_URL}/videos/{short.target_id}"

    return RedirectResponse(url=dest, status_code=status.HTTP_301_MOVED_PERMANENTLY)


def _to_schema(s: ShortUrl) -> ShortUrlResponse:
    return ShortUrlResponse(
        id=s.id,
        code=s.code,
        vanity_slug=s.vanity_slug,
        target_type=s.target_type,
        target_id=s.target_id,
        visit_count=s.visit_count,
        short_url=make_short_url(settings.APP_BASE_URL, s.vanity_slug or s.code),
        created_at=s.created_at,
    )
