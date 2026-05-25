"""Integration tests for podcast shows and episodes."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.show import Show
from app.models.user import User


# ── Show fixtures ─────────────────────────────────────────────────────────────

async def _create_show(
    client: AsyncClient,
    headers: dict,
    slug: str = "test-show",
    title: str = "Test Show",
) -> dict:
    resp = await client.post(
        "/api/v1/shows/",
        headers=headers,
        json={"title": title, "slug": slug, "description": "A test show"},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


class TestCreateShow:
    async def test_moderator_can_create_show(
        self, client: AsyncClient, mod_headers: dict
    ):
        resp = await client.post(
            "/api/v1/shows/",
            headers=mod_headers,
            json={"title": "My Podcast", "slug": "my-podcast", "description": "Cool"},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["slug"] == "my-podcast"
        assert data["title"] == "My Podcast"
        assert data["is_public"] is False

    async def test_admin_can_create_show(
        self, client: AsyncClient, auth_headers: dict
    ):
        resp = await client.post(
            "/api/v1/shows/",
            headers=auth_headers,
            json={"title": "Admin Show", "slug": "admin-show"},
        )
        assert resp.status_code == 201

    async def test_regular_user_cannot_create_show(
        self, client: AsyncClient, user_headers: dict
    ):
        resp = await client.post(
            "/api/v1/shows/",
            headers=user_headers,
            json={"title": "User Show", "slug": "user-show"},
        )
        assert resp.status_code == 403

    async def test_duplicate_slug_rejected(
        self, client: AsyncClient, auth_headers: dict
    ):
        await _create_show(client, auth_headers, "unique-slug-1")
        resp = await client.post(
            "/api/v1/shows/",
            headers=auth_headers,
            json={"title": "Duplicate", "slug": "unique-slug-1"},
        )
        assert resp.status_code == 409

    async def test_invalid_slug_rejected(
        self, client: AsyncClient, auth_headers: dict
    ):
        resp = await client.post(
            "/api/v1/shows/",
            headers=auth_headers,
            json={"title": "Bad Slug", "slug": "INVALID SLUG!"},
        )
        assert resp.status_code == 422

    async def test_unauthenticated_cannot_create(self, client: AsyncClient):
        resp = await client.post(
            "/api/v1/shows/",
            json={"title": "X", "slug": "x"},
        )
        assert resp.status_code == 401


class TestListShows:
    async def test_authenticated_can_list(
        self, client: AsyncClient, auth_headers: dict
    ):
        await _create_show(client, auth_headers, "list-show-1", "List Show 1")
        resp = await client.get("/api/v1/shows/", headers=auth_headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    async def test_unauthenticated_cannot_list(self, client: AsyncClient):
        resp = await client.get("/api/v1/shows/")
        assert resp.status_code == 401


class TestGetShow:
    async def test_get_existing_show(
        self, client: AsyncClient, auth_headers: dict
    ):
        created = await _create_show(client, auth_headers, "get-show-test")
        resp = await client.get(f"/api/v1/shows/{created['slug']}", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["slug"] == "get-show-test"

    async def test_get_nonexistent_show(
        self, client: AsyncClient, auth_headers: dict
    ):
        resp = await client.get("/api/v1/shows/does-not-exist", headers=auth_headers)
        assert resp.status_code == 404


class TestUpdateShow:
    async def test_update_title(
        self, client: AsyncClient, auth_headers: dict
    ):
        created = await _create_show(client, auth_headers, "update-me")
        resp = await client.patch(
            f"/api/v1/shows/{created['slug']}",
            headers=auth_headers,
            json={"title": "Updated Title"},
        )
        assert resp.status_code == 200
        assert resp.json()["title"] == "Updated Title"

    async def test_make_public(
        self, client: AsyncClient, auth_headers: dict
    ):
        created = await _create_show(client, auth_headers, "make-public")
        resp = await client.patch(
            f"/api/v1/shows/{created['slug']}",
            headers=auth_headers,
            json={"is_public": True},
        )
        assert resp.status_code == 200
        assert resp.json()["is_public"] is True

    async def test_user_cannot_update(
        self, client: AsyncClient, auth_headers: dict, user_headers: dict
    ):
        created = await _create_show(client, auth_headers, "no-update-perm")
        resp = await client.patch(
            f"/api/v1/shows/{created['slug']}",
            headers=user_headers,
            json={"title": "Hacked"},
        )
        assert resp.status_code == 403


class TestDeleteShow:
    async def test_moderator_can_delete(
        self, client: AsyncClient, mod_headers: dict
    ):
        created = await _create_show(client, mod_headers, "delete-me-show")
        resp = await client.delete(
            f"/api/v1/shows/{created['slug']}",
            headers=mod_headers,
        )
        assert resp.status_code == 204
        # Verify it's gone
        resp2 = await client.get(
            f"/api/v1/shows/{created['slug']}",
            headers=mod_headers,
        )
        assert resp2.status_code == 404

    async def test_user_cannot_delete(
        self, client: AsyncClient, auth_headers: dict, user_headers: dict
    ):
        created = await _create_show(client, auth_headers, "no-delete-perm")
        resp = await client.delete(
            f"/api/v1/shows/{created['slug']}",
            headers=user_headers,
        )
        assert resp.status_code == 403


class TestRSSFeed:
    async def test_rss_feed_returns_xml(
        self, client: AsyncClient, auth_headers: dict
    ):
        await _create_show(client, auth_headers, "rss-show", "RSS Show")
        resp = await client.get("/api/v1/shows/rss-show/rss")
        assert resp.status_code == 200
        assert "rss" in resp.headers["content-type"]
        assert resp.content.startswith(b"<?xml")
        assert b"RSS Show" in resp.content

    async def test_rss_nonexistent_show(self, client: AsyncClient):
        resp = await client.get("/api/v1/shows/no-such-show/rss")
        assert resp.status_code == 404
