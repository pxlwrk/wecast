"""Integration tests for Role-Based Access Control."""

import pytest
from httpx import AsyncClient


class TestRBACMatrix:
    """
    Verify the complete permission matrix:
    Endpoint                      | User | Moderator | Admin
    GET  /shows/                  |  ✓   |     ✓     |  ✓
    POST /shows/                  |  ✗   |     ✓     |  ✓
    PATCH /shows/{slug}           |  ✗   |     ✓     |  ✓
    DELETE /shows/{slug}          |  ✗   |     ✓     |  ✓
    GET  /users/                  |  ✗   |     ✗     |  ✓
    PATCH /users/{id}/role        |  ✗   |     ✗     |  ✓
    GET  /admin/ldap-groups       |  ✗   |     ✗     |  ✓
    POST /admin/ldap-groups       |  ✗   |     ✗     |  ✓
    """

    async def test_shows_read_all_roles(
        self,
        client: AsyncClient,
        auth_headers: dict,
        mod_headers: dict,
        user_headers: dict,
    ):
        for headers in (auth_headers, mod_headers, user_headers):
            resp = await client.get("/api/v1/shows/", headers=headers)
            assert resp.status_code == 200

    async def test_shows_write_only_mod_admin(
        self,
        client: AsyncClient,
        auth_headers: dict,
        mod_headers: dict,
        user_headers: dict,
    ):
        payload = {"title": "RBAC Show", "slug": "rbac-show-user"}
        resp = await client.post("/api/v1/shows/", headers=user_headers, json=payload)
        assert resp.status_code == 403

        payload["slug"] = "rbac-show-mod"
        resp = await client.post("/api/v1/shows/", headers=mod_headers, json=payload)
        assert resp.status_code == 201

        payload["slug"] = "rbac-show-admin"
        resp = await client.post("/api/v1/shows/", headers=auth_headers, json=payload)
        assert resp.status_code == 201

    async def test_admin_panel_admin_only(
        self,
        client: AsyncClient,
        auth_headers: dict,
        mod_headers: dict,
        user_headers: dict,
    ):
        for headers, expected in [
            (user_headers, 403),
            (mod_headers, 403),
            (auth_headers, 200),
        ]:
            resp = await client.get("/api/v1/admin/ldap-groups", headers=headers)
            assert resp.status_code == expected, f"Expected {expected} got {resp.status_code}"

    async def test_user_list_admin_only(
        self,
        client: AsyncClient,
        auth_headers: dict,
        mod_headers: dict,
        user_headers: dict,
    ):
        for headers, expected in [
            (user_headers, 403),
            (mod_headers, 403),
            (auth_headers, 200),
        ]:
            resp = await client.get("/api/v1/users/", headers=headers)
            assert resp.status_code == expected


class TestUnauthenticated:
    """All protected endpoints must return 401 without token."""

    @pytest.mark.parametrize("method,path", [
        ("GET", "/api/v1/shows/"),
        ("POST", "/api/v1/shows/"),
        ("GET", "/api/v1/users/me"),
        ("GET", "/api/v1/users/"),
        ("GET", "/api/v1/videos/"),
        ("GET", "/api/v1/admin/ldap-groups"),
        ("GET", "/api/v1/shorts/"),
    ])
    async def test_requires_auth(self, client: AsyncClient, method: str, path: str):
        resp = await client.request(method, path)
        assert resp.status_code == 401, f"{method} {path} should be 401, got {resp.status_code}"


class TestExpiredToken:
    async def test_invalid_token_rejected(self, client: AsyncClient):
        resp = await client.get(
            "/api/v1/users/me",
            headers={"Authorization": "Bearer eyJhbGciOiJIUzI1NiJ9.invalid.sig"},
        )
        assert resp.status_code == 401

    async def test_malformed_bearer(self, client: AsyncClient):
        resp = await client.get(
            "/api/v1/users/me",
            headers={"Authorization": "NotBearer token"},
        )
        assert resp.status_code == 401
