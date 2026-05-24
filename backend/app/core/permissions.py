"""Role-Based Access Control: FastAPI dependencies and decorators."""

from typing import Optional

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import decode_access_token

bearer_scheme = HTTPBearer(auto_error=False)


class CurrentUser:
    """Represents the authenticated user extracted from the JWT."""

    def __init__(self, user_id: int, role: str):
        self.user_id = user_id
        self.role = role

    @property
    def is_admin(self) -> bool:
        return self.role == "admin"

    @property
    def is_moderator(self) -> bool:
        return self.role in ("admin", "moderator")


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> CurrentUser:
    """
    FastAPI dependency: validates Bearer JWT and returns CurrentUser.
    Raises 401 if token is missing or invalid.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = decode_access_token(credentials.credentials)
        user_id = int(payload["sub"])
        role = payload.get("role", "user")
    except (JWTError, KeyError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return CurrentUser(user_id=user_id, role=role)


async def require_admin(current: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    """Dependency: ensures the caller has admin role."""
    if not current.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required")
    return current


async def require_moderator(current: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    """Dependency: ensures the caller has at least moderator role."""
    if not current.is_moderator:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Moderator role required"
        )
    return current
