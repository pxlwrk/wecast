"""Podcast Show ORM model."""

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Show(Base):
    __tablename__ = "shows"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text)
    cover_image_path: Mapped[Optional[str]] = mapped_column(String(1024))
    is_public: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # Visibility: public | internal | restricted | unlisted
    visibility: Mapped[str] = mapped_column(String(50), default="internal", nullable=False)
    # AD group DNs allowed to access (only used when visibility="restricted")
    allowed_group_dns: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
    owner_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    owner: Mapped[Optional["User"]] = relationship("User", back_populates="shows")  # type: ignore
    episodes: Mapped[list["Episode"]] = relationship(  # type: ignore
        "Episode", back_populates="show", cascade="all, delete-orphan"
    )
