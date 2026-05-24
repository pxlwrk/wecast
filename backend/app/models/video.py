"""Video ORM model (uploaded and screen recordings)."""

from datetime import datetime
from typing import Optional

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Video(Base):
    __tablename__ = "videos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text)
    # MinIO paths
    original_path: Mapped[Optional[str]] = mapped_column(String(1024))
    hls_path: Mapped[Optional[str]] = mapped_column(String(1024))  # master.m3u8
    thumbnail_path: Mapped[Optional[str]] = mapped_column(String(1024))
    subtitles_vtt_path: Mapped[Optional[str]] = mapped_column(String(1024))
    duration_sec: Mapped[Optional[int]] = mapped_column(Integer)
    file_size: Mapped[Optional[int]] = mapped_column(BigInteger)
    # Processing status
    transcode_status: Mapped[str] = mapped_column(
        String(50), default="pending", nullable=False
    )
    transcript_status: Mapped[str] = mapped_column(
        String(50), default="pending", nullable=False
    )
    # Whether this was captured via the built-in screen recorder
    is_recording: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # Chunked upload state (for recordings)
    chunks_received: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    # Overall status: draft | processing | published | error
    status: Mapped[str] = mapped_column(String(50), default="draft", nullable=False)
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    owner_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    owner: Mapped[Optional["User"]] = relationship("User", back_populates="videos")  # type: ignore
