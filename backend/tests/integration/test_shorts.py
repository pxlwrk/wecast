"""Integration tests for short URL creation and redirect."""

import pytest
from httpx import AsyncClient


class TestCreateShortUrl:
    async def test_create_short_url_for_video(
        self, client: AsyncClient, auth_headers: dict
    ):
        resp = await client.post(
            "/api/v1/shorts/",
            headers=auth_headers,
            json={"target_type": "video", "target_id": 1},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["code"]
        assert data["target_type"] == "video"
        assert data["target_id"] == 1
        assert data["visit_count"] == 0
        assert "/s/" in data["short_url"]

    async def test_create_with_vanity_slug(
        self, client: AsyncClient, auth_headers: dict
    ):
        resp = await client.post(
            "/api/v1/shorts/",
            headers=auth_headers,
            json={"target_type": "episode", "target_id": 5, "vanity_slug": "team-meeting"},
        )
        assert resp.status_code == 201
        assert resp.json()["vanity_slug"] == "team-meeting"
        assert "team-meeting" in resp.json()["short_url"]

    async def test_duplicate_vanity_slug_rejected(
        self, client: AsyncClient, auth_headers: dict
    ):
        await client.post(
            "/api/v1/shorts/",
            headers=auth_headers,
            json={"target_type": "video", "target_id": 1, "vanity_slug": "unique-vanity"},
        )
        resp = await client.post(
            "/api/v1/shorts/",
            headers=auth_headers,
            json={"target_type": "video", "target_id": 2, "vanity_slug": "unique-vanity"},
        )
        assert resp.status_code == 409

    async def test_invalid_target_type(
        self, client: AsyncClient, auth_headers: dict
    ):
        resp = await client.post(
            "/api/v1/shorts/",
            headers=auth_headers,
            json={"target_type": "podcast", "target_id": 1},
        )
        assert resp.status_code == 422

    async def test_unauthenticated_cannot_create(self, client: AsyncClient):
        resp = await client.post(
            "/api/v1/shorts/",
            json={"target_type": "video", "target_id": 1},
        )
        assert resp.status_code == 401

    async def test_codes_are_base62(
        self, client: AsyncClient, auth_headers: dict
    ):
        """All generated codes must only contain Base62 characters."""
        for _ in range(5):
            resp = await client.post(
                "/api/v1/shorts/",
                headers=auth_headers,
                json={"target_type": "video", "target_id": 1},
            )
            code = resp.json()["code"]
            assert all(c in "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz" for c in code)

    async def test_codes_are_unique(
        self, client: AsyncClient, auth_headers: dict
    ):
        codes = set()
        for _ in range(10):
            resp = await client.post(
                "/api/v1/shorts/",
                headers=auth_headers,
                json={"target_type": "video", "target_id": 1},
            )
            codes.add(resp.json()["code"])
        assert len(codes) == 10


class TestRedirect:
    async def test_redirect_by_code(
        self, client: AsyncClient, auth_headers: dict
    ):
        create = await client.post(
            "/api/v1/shorts/",
            headers=auth_headers,
            json={"target_type": "video", "target_id": 42},
        )
        code = create.json()["code"]

        resp = await client.get(f"/api/v1/s/{code}", follow_redirects=False)
        assert resp.status_code == 301
        assert "/videos/42" in resp.headers["location"]

    async def test_redirect_by_vanity_slug(
        self, client: AsyncClient, auth_headers: dict
    ):
        await client.post(
            "/api/v1/shorts/",
            headers=auth_headers,
            json={"target_type": "episode", "target_id": 7, "vanity_slug": "ep-seven"},
        )
        resp = await client.get("/api/v1/s/ep-seven", follow_redirects=False)
        assert resp.status_code == 301
        assert "/episode/7" in resp.headers["location"]

    async def test_redirect_increments_visit_count(
        self, client: AsyncClient, auth_headers: dict
    ):
        create = await client.post(
            "/api/v1/shorts/",
            headers=auth_headers,
            json={"target_type": "video", "target_id": 1, "vanity_slug": "count-test"},
        )
        assert create.json()["visit_count"] == 0

        await client.get("/api/v1/s/count-test", follow_redirects=False)
        await client.get("/api/v1/s/count-test", follow_redirects=False)
        await client.get("/api/v1/s/count-test", follow_redirects=False)

        # Check updated count via list
        list_resp = await client.get("/api/v1/shorts/", headers=auth_headers)
        matching = [s for s in list_resp.json() if s["vanity_slug"] == "count-test"]
        assert matching[0]["visit_count"] == 3

    async def test_redirect_nonexistent_code(self, client: AsyncClient):
        resp = await client.get("/api/v1/s/zzz999", follow_redirects=False)
        assert resp.status_code == 404
