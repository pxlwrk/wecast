from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class VideoCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=512)
    description: Optional[str] = None


class VideoUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=512)
    description: Optional[str] = None
    status: Optional[str] = None
    visibility: Optional[str] = None
    allowed_group_dns: Optional[list[str]] = None


class VideoList(BaseModel):
    id: int
    title: str
    slug: str
    description: Optional[str]
    thumbnail_url: Optional[str] = None
    duration_sec: Optional[int]
    transcode_status: str
    transcript_status: str
    status: str
    is_recording: bool
    published_at: Optional[datetime]
    created_at: datetime
    visibility: str = "internal"
    allowed_group_dns: Optional[list[str]] = None

    model_config = {"from_attributes": True}


class VideoDetail(VideoList):
    hls_url: Optional[str] = None
    subtitles_url: Optional[str] = None
    owner_id: Optional[int]
    updated_at: datetime


class PresignedUploadResponse(BaseModel):
    upload_url: str
    video_id: int
    object_key: str
    expires_in: int
