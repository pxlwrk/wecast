"""Role-Based Access Control: FastAPI dependencies and decorators."""

from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError

from app.core.security import decode_access_token

bearer_scheme = HTTPBearer(auto_error=False)

VISIBILITY_PUBLIC     = "public"
VISIBILITY_INTERNAL   = "internal"
VISIBILITY_RESTRICTED = "restricted"
VISIBILITY_UNLISTED   = "unlisted"


class CurrentUser:
    """Represents the authenticated user extracted from the JWT."""

    def __init__(self, user_id: int, role: str, groups: list[str] | None = None):
        self.user_id = user_id
        self.role = role
        self.groups: list[str] = groups or []

    @property
    def is_admin(self) -> bool:
        return self.role == "admin"

    @property
    def is_moderator(self) -> bool:
        return self.role in ("admin", "moderator")

    def can_access(self, visibility: str, allowed_group_dns: list[str] | None = None) -> bool:
        """Check if this user can access a resource with the given visibility."""
        if visibility == VISIBILITY_PUBLIC:
            return True
        if visibility == VISIBILITY_INTERNAL:
            return True  # Any authenticated user
        if visibility == VISIBILITY_UNLISTED:
            return True  # Authenticated user can access via direct link
        if visibility == VISIBILITY_RESTRICTED:
            if self.is_admin:
                return True
            if not allowed_group_dns:
                return True  # No restrictions configured → everyone
            return bool(set(self.groups) & set(allowed_group_dns))
        return False

    def is_visible_in_list(
        self,
        visibility: str,
        allowed_group_dns: list[str] | None,
        owner_id: int | None,
    ) -> bool:
        """Whether a resource should appear in browse listings for this user."""
        if visibility == VISIBILITY_UNLISTED:
            # Only owner and admins see unlisted items in their own lists
            return self.is_admin or self.user_id == owner_id
        return self.can_access(visibility, allowed_group_dns)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> CurrentUser:
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
        groups = payload.get("groups", [])
    except (JWTError, KeyError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return CurrentUser(user_id=user_id, role=role, groups=groups)


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> Optional[CurrentUser]:
    """Like get_current_user but returns None for unauthenticated requests."""
    if not credentials:
        return None
    try:
        payload = decode_access_token(credentials.credentials)
        user_id = int(payload["sub"])
        role = payload.get("role", "user")
        groups = payload.get("groups", [])
        return CurrentUser(user_id=user_id, role=role, groups=groups)
    except (JWTError, KeyError, ValueError):
        return None


async def require_admin(current: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if not current.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required")
    return current


async def require_moderator(current: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if not current.is_moderator:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Moderator role required")
    return current
