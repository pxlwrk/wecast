"""Short URL ORM model."""

from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.core.database import Base


class ShortUrl(Base):
    __tablename__ = "short_urls"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    # Auto-generated Base62 code
    code: Mapped[str] = mapped_column(String(16), unique=True, nullable=False, index=True)
    # Optional custom vanity slug (e.g. "team-meeting")
    vanity_slug: Mapped[Optional[str]] = mapped_column(String(128), unique=True, nullable=True)
    target_type: Mapped[str] = mapped_column(String(50), nullable=False)  # episode | video
    target_id: Mapped[int] = mapped_column(Integer, nullable=False)
    visit_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_by: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    last_visited_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
