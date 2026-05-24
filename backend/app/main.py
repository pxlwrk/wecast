"""WeCast FastAPI application – entry point."""

import structlog
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1 import admin, auth, embed, recordings, shorts, shows, users, videos
from app.core.config import settings
from app.core.database import engine
from app.models import *  # noqa: F401, F403 – ensures all models register with Base

log = structlog.get_logger(__name__)


def create_app() -> FastAPI:
    app = FastAPI(
        title="WeCast API",
        description="Enterprise Media Portal – Podcasts & Videos",
        version="0.1.0",
        docs_url="/api/docs" if settings.DEBUG else None,
        redoc_url="/api/redoc" if settings.DEBUG else None,
        openapi_url="/api/openapi.json" if settings.DEBUG else None,
    )

    # ── CORS ────────────────────────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
    )

    # ── Security Headers Middleware ──────────────────────────────────────────────
    @app.middleware("http")
    async def add_security_headers(request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        if not settings.DEBUG:
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains"
            )
        # Content-Security-Policy – embed pages allow iframes from company domains
        is_embed = request.url.path.startswith("/embed")
        if is_embed:
            csp = "default-src 'self'; frame-ancestors 'self' *.company.com;"
        else:
            csp = "default-src 'self'; frame-ancestors 'none';"
        response.headers["Content-Security-Policy"] = csp
        return response

    # ── Startup / Shutdown ───────────────────────────────────────────────────────
    @app.on_event("startup")
    async def on_startup() -> None:
        # Ensure MinIO buckets exist
        from app.services.storage import ensure_buckets
        try:
            ensure_buckets()
        except Exception as exc:
            log.warning("startup.minio_init_failed", error=str(exc))

        # Ensure local admin exists (only on first run)
        if settings.LOCAL_ADMIN_PASSWORD:
            from sqlalchemy import select
            from app.core.database import AsyncSessionLocal
            from app.core.security import hash_password
            from app.models.user import User
            async with AsyncSessionLocal() as db:
                result = await db.execute(
                    select(User).where(User.username == settings.LOCAL_ADMIN_USERNAME)
                )
                if not result.scalar_one_or_none():
                    admin_user = User(
                        username=settings.LOCAL_ADMIN_USERNAME,
                        email=f"{settings.LOCAL_ADMIN_USERNAME}@localhost",
                        display_name="Local Admin",
                        password_hash=hash_password(settings.LOCAL_ADMIN_PASSWORD),
                        role="admin",
                        is_local_admin=True,
                    )
                    db.add(admin_user)
                    await db.commit()
                    log.info("startup.local_admin_created", username=settings.LOCAL_ADMIN_USERNAME)

        log.info("startup.complete", app=settings.APP_NAME, env=settings.APP_ENV)

    @app.on_event("shutdown")
    async def on_shutdown() -> None:
        await engine.dispose()

    # ── Routers ──────────────────────────────────────────────────────────────────
    API_PREFIX = "/api/v1"
    app.include_router(auth.router, prefix=API_PREFIX)
    app.include_router(users.router, prefix=API_PREFIX)
    app.include_router(shows.router, prefix=API_PREFIX)
    app.include_router(videos.router, prefix=API_PREFIX)
    app.include_router(recordings.router, prefix=API_PREFIX)
    app.include_router(shorts.router, prefix=API_PREFIX)
    app.include_router(embed.router, prefix=API_PREFIX)
    app.include_router(admin.router, prefix=API_PREFIX)

    # ── Health probe (no auth) ───────────────────────────────────────────────────
    @app.get("/healthz", include_in_schema=False)
    async def healthz() -> dict:
        return {"status": "ok"}

    return app


app = create_app()
