"""
Shared pytest fixtures for WeCast backend tests.

Design
------
* All async fixtures and test functions share the session-level event loop
  (asyncio_default_fixture_loop_scope = asyncio_default_test_loop_scope = "session").
* Tables are created once per test session (session-scoped setup_database).
* Between tests an autouse fixture truncates every data table so each test
  starts with a clean slate regardless of whether the app code committed.
"""

from __future__ import annotations

from typing import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.core.database import Base, get_db
from app.core.security import create_access_token, hash_password
from app.main import app
from app.models.user import User

# ── Engine & session factory ───────────────────────────────────────────────────

_engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=0,
)

_SessionLocal = async_sessionmaker(
    bind=_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Tables to truncate in FK-safe order (children before parents)
_DATA_TABLES = [
    "audit_logs",
    "refresh_tokens",
    "short_urls",
    "episodes",
    "videos",
    "shows",
    "ldap_group_mappings",
    "users",
]


# ── Schema lifecycle (session-wide) ───────────────────────────────────────────

@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_database():
    """Create all tables once; drop them after the whole test session."""
    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await _engine.dispose()


# ── Per-test isolation via TRUNCATE ───────────────────────────────────────────

@pytest_asyncio.fixture(autouse=True)
async def clean_tables(setup_database):  # noqa: F811 – depends on session fixture
    """Truncate all data tables before each test for a clean slate."""
    async with _engine.begin() as conn:
        tables = ", ".join(_DATA_TABLES)
        await conn.execute(text(f"TRUNCATE {tables} RESTART IDENTITY CASCADE"))
    yield


# ── Per-test DB session ───────────────────────────────────────────────────────

@pytest_asyncio.fixture
async def db() -> AsyncGenerator[AsyncSession, None]:
    """Provide a fresh AsyncSession per test."""
    async with _SessionLocal() as session:
        yield session
        await session.rollback()


# ── HTTP test client ──────────────────────────────────────────────────────────

@pytest_asyncio.fixture
async def client(db: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Async HTTPX client backed by the test DB session."""

    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield db

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac
    app.dependency_overrides.clear()


# ── User fixtures ─────────────────────────────────────────────────────────────

@pytest_asyncio.fixture
async def admin_user(db: AsyncSession) -> User:
    user = User(
        username="test_admin",
        email="admin@test.com",
        display_name="Test Admin",
        password_hash=hash_password("admin_password"),
        role="admin",
        is_local_admin=True,
        is_active=True,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user


@pytest_asyncio.fixture
async def moderator_user(db: AsyncSession) -> User:
    user = User(
        username="test_moderator",
        email="mod@test.com",
        display_name="Test Moderator",
        password_hash=hash_password("mod_password"),
        role="moderator",
        is_active=True,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user


@pytest_asyncio.fixture
async def regular_user(db: AsyncSession) -> User:
    user = User(
        username="test_user",
        email="user@test.com",
        display_name="Test User",
        password_hash=hash_password("user_password"),
        role="user",
        is_active=True,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user


# ── Auth token / header helpers ───────────────────────────────────────────────

@pytest.fixture
def admin_token(admin_user: User) -> str:
    return create_access_token(admin_user.id, "admin")


@pytest.fixture
def moderator_token(moderator_user: User) -> str:
    return create_access_token(moderator_user.id, "moderator")


@pytest.fixture
def user_token(regular_user: User) -> str:
    return create_access_token(regular_user.id, "user")


@pytest.fixture
def auth_headers(admin_token: str) -> dict:
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture
def mod_headers(moderator_token: str) -> dict:
    return {"Authorization": f"Bearer {moderator_token}"}


@pytest.fixture
def user_headers(user_token: str) -> dict:
    return {"Authorization": f"Bearer {user_token}"}
