from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ShowCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    slug: str = Field(..., min_length=1, max_length=255, pattern=r"^[a-z0-9-]+$")
    description: Optional[str] = None
    is_public: bool = False


class ShowUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    is_public: Optional[bool] = None


class ShowList(BaseModel):
    id: int
    title: str
    slug: str
    description: Optional[str]
    cover_image_url: Optional[str] = None
    is_public: bool
    episode_count: int = 0
    created_at: datetime

    model_config = {"from_attributes": True}


class ShowDetail(ShowList):
    owner_id: Optional[int]
    updated_at: datetime
