from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr


class UserMe(BaseModel):
    id: int
    username: str
    email: str
    display_name: str
    avatar_url: Optional[str]
    role: str
    is_active: bool
    last_login: Optional[datetime]

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None


class UserListItem(BaseModel):
    id: int
    username: str
    email: str
    display_name: str
    role: str
    is_active: bool
    last_login: Optional[datetime]

    model_config = {"from_attributes": True}
