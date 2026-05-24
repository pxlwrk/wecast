"""Screen recorder endpoints: start, chunk upload, finish."""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.permissions import CurrentUser, get_current_user
from app.models.video import Video
from app.schemas.video import VideoDetail
from app.services import storage
from app.api.v1.videos import _video_detail

router = APIRouter(prefix="/recordings", tags=["recordings"])


@router.post("/start", response_model=VideoDetail, status_code=status.HTTP_201_CREATED,
             summary="Initialise a new screen recording session")
async def start_recording(
    title: str,
    description: str | None = None,
    db: AsyncSession = Depends(get_db),
    current: CurrentUser = Depends(get_current_user),
) -> VideoDetail:
    video = Video(
        title=title,
        description=description,
        slug=f"rec-{__import__('secrets').token_hex(6)}",
        owner_id=current.user_id,
        is_recording=True,
        status="recording",
        transcode_status="pending",
        transcript_status="pending",
    )
    db.add(video)
    await db.commit()
    await db.refresh(video)
    return _video_detail(video)


@router.post("/{recording_id}/chunk", status_code=status.HTTP_204_NO_CONTENT,
             summary="Upload a WebM chunk from the screen recorder")
async def upload_chunk(
    recording_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current: CurrentUser = Depends(get_current_user),
) -> None:
    video = await _get_recording_or_404(recording_id, db, current)

    chunk_data = await request.body()
    if not chunk_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty chunk")

    chunk_key = f"recordings/{recording_id}/chunk_{video.chunks_received:06d}.webm"
    storage.upload_bytes(settings.MINIO_BUCKET_RECORDINGS, chunk_key, chunk_data, "video/webm")

    video.chunks_received += 1
    await db.commit()


@router.post("/{recording_id}/finish", response_model=VideoDetail,
             summary="Finalise recording and trigger processing pipeline")
async def finish_recording(
    recording_id: int,
    db: AsyncSession = Depends(get_db),
    current: CurrentUser = Depends(get_current_user),
) -> VideoDetail:
    video = await _get_recording_or_404(recording_id, db, current)

    if video.chunks_received == 0:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="No chunks received")

    video.status = "processing"
    await db.commit()

    from arq import create_pool
    from arq.connections import RedisSettings
    redis = await create_pool(RedisSettings.from_dsn(settings.REDIS_URL))
    await redis.enqueue_job("merge_recording_chunks", recording_id)
    await redis.close()

    return _video_detail(video)


async def _get_recording_or_404(recording_id: int, db: AsyncSession, current: CurrentUser) -> Video:
    video = await db.get(Video, recording_id)
    if not video or not video.is_recording:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recording not found")
    if video.owner_id != current.user_id and not current.is_moderator:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your recording")
    return video
