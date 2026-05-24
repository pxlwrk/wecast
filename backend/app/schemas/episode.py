from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class EpisodeCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=512)
    description: Optional[str] = None


class EpisodeUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=512)
    description: Optional[str] = None
    status: Optional[str] = None


class TranscriptSegment(BaseModel):
    start: float
    end: float
    text: str


class EpisodeList(BaseModel):
    id: int
    show_id: int
    title: str
    slug: str
    description: Optional[str]
    duration_sec: Optional[int]
    transcript_status: str
    status: str
    published_at: Optional[datetime]
    created_at: datetime

    model_config = {"from_attributes": True}


class EpisodeDetail(EpisodeList):
    audio_url: Optional[str] = None
    transcript_json: Optional[dict] = None
    summary: Optional[str] = None
    chapters_json: Optional[list] = None
    updated_at: datetime
