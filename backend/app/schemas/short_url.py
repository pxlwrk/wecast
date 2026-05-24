from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ShortUrlCreate(BaseModel):
    target_type: str = Field(..., pattern=r"^(episode|video)$")
    target_id: int
    vanity_slug: Optional[str] = Field(
        None, min_length=3, max_length=128, pattern=r"^[a-z0-9-]+$"
    )


class ShortUrlResponse(BaseModel):
    id: int
    code: str
    vanity_slug: Optional[str]
    target_type: str
    target_id: int
    visit_count: int
    short_url: str  # Full URL including domain
    created_at: datetime

    model_config = {"from_attributes": True}
