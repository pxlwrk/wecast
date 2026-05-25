"""Integration tests for user management endpoints."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


class TestGetMe:
    async def test_get_own_profile(self, client: AsyncClient, auth_headers: dict, admin_user: User):
        resp = await client.get("/api/v1/users/me", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["username"] == "test_admin"
        assert data["role"] == "admin"
        assert "password_hash" not in data

    async def test_get_me_without_auth(self, client: AsyncClient):
        resp = await client.get("/api/v1/users/me")
        assert resp.status_code == 401

    async def test_get_me_with_invalid_token(self, client: AsyncClient):
        resp = await client.get(
            "/api/v1/users/me",
            headers={"Authorization": "Bearer invalid.token.here"},
        )
        assert resp.status_code == 401


class TestUpdateMe:
    async def test_update_display_name(
        self, client: AsyncClient, auth_headers: dict, admin_user: User, db: AsyncSession
    ):
        resp = await client.patch(
            "/api/v1/users/me",
            headers=auth_headers,
            json={"display_name": "Updated Name"},
        )
        assert resp.status_code == 200
        assert resp.json()["display_name"] == "Updated Name"

    async def test_partial_update(self, client: AsyncClient, auth_headers: dict):
        resp = await client.patch(
            "/api/v1/users/me",
            headers=auth_headers,
            json={"avatar_url": "https://example.com/avatar.jpg"},
        )
        assert resp.status_code == 200
        assert resp.json()["avatar_url"] == "https://example.com/avatar.jpg"


class TestListUsers:
    async def test_admin_can_list_users(
        self, client: AsyncClient, auth_headers: dict, admin_user: User
    ):
        resp = await client.get("/api/v1/users/", headers=auth_headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)
        assert len(resp.json()) >= 1

    async def test_regular_user_cannot_list(
        self, client: AsyncClient, user_headers: dict
    ):
        resp = await client.get("/api/v1/users/", headers=user_headers)
        assert resp.status_code == 403

    async def test_moderator_cannot_list(
        self, client: AsyncClient, mod_headers: dict
    ):
        resp = await client.get("/api/v1/users/", headers=mod_headers)
        assert resp.status_code == 403


class TestSetRole:
    async def test_admin_can_change_role(
        self,
        client: AsyncClient,
        auth_headers: dict,
        regular_user: User,
        db: AsyncSession,
    ):
        resp = await client.patch(
            f"/api/v1/users/{regular_user.id}/role?role=moderator",
            headers=auth_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["role"] == "moderator"
        await db.refresh(regular_user)
        assert regular_user.role == "moderator"

    async def test_invalid_role_rejected(
        self, client: AsyncClient, auth_headers: dict, regular_user: User
    ):
        resp = await client.patch(
            f"/api/v1/users/{regular_user.id}/role?role=superuser",
            headers=auth_headers,
        )
        assert resp.status_code == 400

    async def test_non_admin_cannot_change_role(
        self, client: AsyncClient, mod_headers: dict, regular_user: User
    ):
        resp = await client.patch(
            f"/api/v1/users/{regular_user.id}/role?role=admin",
            headers=mod_headers,
        )
        assert resp.status_code == 403

    async def test_change_nonexistent_user(
        self, client: AsyncClient, auth_headers: dict
    ):
        resp = await client.patch(
            "/api/v1/users/99999/role?role=user",
            headers=auth_headers,
        )
        assert resp.status_code == 404
