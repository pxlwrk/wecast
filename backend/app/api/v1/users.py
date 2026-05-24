"""User management endpoints."""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.permissions import CurrentUser, get_current_user, require_admin
from app.models.user import User
from app.schemas.user import UserListItem, UserMe, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserMe, summary="Get current user profile")
async def get_me(current: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> UserMe:
    user = await db.get(User, current.user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return UserMe.model_validate(user)


@router.patch("/me", response_model=UserMe, summary="Update own profile")
async def update_me(
    body: UserUpdate,
    current: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserMe:
    user = await db.get(User, current.user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if body.display_name is not None:
        user.display_name = body.display_name
    if body.avatar_url is not None:
        user.avatar_url = body.avatar_url
    await db.commit()
    return UserMe.model_validate(user)


@router.get("/", response_model=List[UserListItem], summary="List all users (admin)")
async def list_users(
    db: AsyncSession = Depends(get_db),
    _: CurrentUser = Depends(require_admin),
) -> List[UserListItem]:
    result = await db.execute(select(User).order_by(User.username))
    return [UserListItem.model_validate(u) for u in result.scalars()]


@router.patch("/{user_id}/role", response_model=UserListItem, summary="Set user role (admin)")
async def set_role(
    user_id: int,
    role: str,
    db: AsyncSession = Depends(get_db),
    _: CurrentUser = Depends(require_admin),
) -> UserListItem:
    if role not in ("admin", "moderator", "user"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role")
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.role = role
    await db.commit()
    return UserListItem.model_validate(user)


@router.patch("/{user_id}/deactivate", status_code=status.HTTP_204_NO_CONTENT, summary="Deactivate user (admin)")
async def deactivate_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current: CurrentUser = Depends(require_admin),
) -> None:
    if user_id == current.user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot deactivate yourself")
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.is_active = False
    await db.commit()
