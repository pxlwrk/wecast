"""Authentication endpoints: login, refresh, logout."""

from datetime import UTC, datetime

import structlog
from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.ldap import LDAPAuthError, authenticate as ldap_authenticate, resolve_role
from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_ip,
    hash_refresh_token,
    verify_password,
)
from app.models.audit_log import AuditLog
from app.models.user import RefreshToken, User
from app.schemas.auth import LoginRequest, TokenPair

router = APIRouter(prefix="/auth", tags=["auth"])
log = structlog.get_logger(__name__)

COOKIE_NAME = "wecast_refresh"
COOKIE_MAX_AGE = settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400


@router.post("/login", response_model=TokenPair, summary="Login via LDAP or local admin")
async def login(
    body: LoginRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> TokenPair:
    ip = request.client.host if request.client else "unknown"
    user = None

    # ── 1. Try LDAP authentication ────────────────────────────────────────────
    if settings.LDAP_ENABLED:
        try:
            ldap_user = ldap_authenticate(body.username, body.password)
        except LDAPAuthError as exc:
            log.error("auth.ldap_error", error=str(exc))
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="LDAP service unavailable",
            )

        if ldap_user:
            role = resolve_role(ldap_user.groups)
            # Upsert user in local DB (LDAP cache)
            result = await db.execute(select(User).where(User.ldap_dn == ldap_user.dn))
            user = result.scalar_one_or_none()
            if user:
                user.email = ldap_user.email
                user.display_name = ldap_user.display_name
                user.role = role
                user.ldap_groups = ldap_user.groups[:100]  # cap at 100 groups
                user.last_login = datetime.now(UTC)
            else:
                user = User(
                    ldap_dn=ldap_user.dn,
                    username=ldap_user.username,
                    email=ldap_user.email,
                    display_name=ldap_user.display_name,
                    role=role,
                    ldap_groups=ldap_user.groups[:100],
                    last_login=datetime.now(UTC),
                )
                db.add(user)
            await db.flush()

    # ── 2. Local admin fallback ───────────────────────────────────────────────
    if user is None:
        result = await db.execute(
            select(User).where(User.username == body.username, User.is_local_admin == True)  # noqa: E712
        )
        local_admin = result.scalar_one_or_none()
        if local_admin and local_admin.password_hash and verify_password(
            body.password, local_admin.password_hash
        ):
            local_admin.last_login = datetime.now(UTC)
            user = local_admin
        else:
            await _log_audit(db, None, "auth.login_failed", ip=ip)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials",
            )

    await db.flush()

    # ── 3. Issue tokens ───────────────────────────────────────────────────────
    access_token = create_access_token(user.id, user.role, getattr(user, 'ldap_groups', []) or [])
    raw_refresh, token_hash = create_refresh_token(user.id)

    rt = RefreshToken(
        token_hash=token_hash,
        user_id=user.id,
        expires_at=datetime.fromtimestamp(
            # decode expiry without verification overhead
            __import__("jose").jwt.get_unverified_claims(raw_refresh)["exp"],
            tz=UTC,
        ),
    )
    db.add(rt)
    await db.flush()

    await _log_audit(db, user.id, "auth.login", ip=ip)
    await db.commit()

    # Set refresh token as HTTP-only cookie
    response.set_cookie(
        key=COOKIE_NAME,
        value=raw_refresh,
        httponly=True,
        secure=not settings.DEBUG,
        samesite="strict",
        max_age=COOKIE_MAX_AGE,
        path="/api/v1/auth",
    )

    return TokenPair(
        access_token=access_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/refresh", response_model=TokenPair, summary="Rotate refresh token")
async def refresh(
    response: Response,
    db: AsyncSession = Depends(get_db),
    refresh_cookie: str | None = Cookie(default=None, alias=COOKIE_NAME),
) -> TokenPair:
    if not refresh_cookie:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No refresh token")

    from jose import JWTError

    from app.core.security import decode_refresh_token

    try:
        payload = decode_refresh_token(refresh_cookie)
        user_id = int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    token_hash = hash_refresh_token(refresh_cookie)
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token_hash == token_hash,
            RefreshToken.user_id == user_id,
            RefreshToken.revoked == False,  # noqa: E712
        )
    )
    rt = result.scalar_one_or_none()
    if not rt or rt.expires_at < datetime.now(UTC):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired or revoked")

    # Revoke old, issue new
    rt.revoked = True

    user = await db.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User inactive")

    access_token = create_access_token(user.id, user.role, getattr(user, 'ldap_groups', []) or [])
    raw_refresh, new_hash = create_refresh_token(user.id)

    new_rt = RefreshToken(
        token_hash=new_hash,
        user_id=user.id,
        expires_at=datetime.fromtimestamp(
            __import__("jose").jwt.get_unverified_claims(raw_refresh)["exp"],
            tz=UTC,
        ),
    )
    db.add(new_rt)
    await db.commit()

    response.set_cookie(
        key=COOKIE_NAME,
        value=raw_refresh,
        httponly=True,
        secure=not settings.DEBUG,
        samesite="strict",
        max_age=COOKIE_MAX_AGE,
        path="/api/v1/auth",
    )

    return TokenPair(
        access_token=access_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT, summary="Logout and revoke token")
async def logout(
    response: Response,
    db: AsyncSession = Depends(get_db),
    refresh_cookie: str | None = Cookie(default=None, alias=COOKIE_NAME),
) -> None:
    if refresh_cookie:
        token_hash = hash_refresh_token(refresh_cookie)
        result = await db.execute(
            select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        )
        rt = result.scalar_one_or_none()
        if rt:
            rt.revoked = True
            await db.commit()

    response.delete_cookie(key=COOKIE_NAME, path="/api/v1/auth")


async def _log_audit(db: AsyncSession, user_id: int | None, action: str, ip: str) -> None:
    if settings.AUDIT_LOG_ENABLED:
        db.add(AuditLog(user_id=user_id, action=action, ip_hash=hash_ip(ip)))
