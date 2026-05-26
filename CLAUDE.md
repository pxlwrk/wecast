# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is WeCast

WeCast is a self-hosted enterprise media portal for podcasts and videos with local AI transcription, Active Directory SSO, and WCAG 2.1 AA accessibility. It is deployed on bare metal/VMs via systemd + Nginx.

## Development Commands

### Infrastructure (PostgreSQL, Redis, MinIO)

```bash
docker compose -f docker-compose.dev.yml up -d
```

### Backend

```bash
cd backend
python3.12 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env           # then fill in secrets

alembic upgrade head            # apply migrations
uvicorn app.main:app --reload --port 8000

# ARQ background worker (separate terminal)
arq app.tasks.worker.WorkerSettings

# Seed demo data
python scripts/seed.py
```

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev                    # http://localhost:3000
```

### Tests

```bash
# Backend — full suite
cd backend && pytest tests/ -v

# Backend — single test file
pytest tests/unit/test_security.py -v

# Backend — single test
pytest tests/integration/test_auth.py::test_login_success -v

# Frontend
cd frontend && npm test
```

### Linting / Type Checking

```bash
cd backend && ruff check .          # lint (line-length 100, Python 3.12)
cd backend && ruff format .         # format
cd backend && mypy app/             # type check

cd frontend && npm run lint         # eslint via next lint
```

## Architecture

### Backend (`backend/`)

**FastAPI + SQLAlchemy async** application. All API routes live under `/api/v1/`. Swagger UI is available at `/api/docs` only when `DEBUG=true`.

```
app/
  main.py            – app factory, middleware, router registration, startup hooks
  core/
    config.py        – pydantic-settings (reads .env); singleton via @lru_cache
    database.py      – async SQLAlchemy engine + AsyncSessionLocal + Base
    security.py      – JWT creation/validation, bcrypt, IP pseudonymisation
    permissions.py   – FastAPI RBAC dependencies (get_current_user, require_admin, require_moderator)
    ldap.py          – LDAP/AD authentication
  api/v1/            – one file per resource: auth, users, shows, videos, recordings, shorts, embed, admin
  models/            – SQLAlchemy ORM models (User, RefreshToken, LdapGroupMapping, Show, Episode, Video, ShortUrl, AuditLog)
  schemas/           – Pydantic request/response schemas
  services/
    storage.py       – MinIO abstraction (upload, download, presigned URLs)
    ffmpeg.py        – thumbnail extraction, HLS transcoding, audio extraction, chunk concat
    transcription.py – faster-whisper wrapper, segments → VTT
    ollama.py        – Ollama text generation (summaries, chapters)
    url_shortener.py – short code generation
  tasks/
    worker.py        – ARQ WorkerSettings (max_jobs=2, job_timeout=3600s)
    transcribe.py    – ARQ tasks: transcribe_episode, transcode_and_transcribe_video, merge_recording_chunks
```

**Authentication flow:**
- LDAP/AD is the primary auth; local admin (`is_local_admin=True`) is the fallback created on startup from `LOCAL_ADMIN_PASSWORD`.
- Login returns a short-lived access token (15 min, in JSON body) + long-lived refresh token (7 days, HTTP-only cookie).
- Refresh tokens are stored as SHA-256 hashes in the `refresh_tokens` table (never raw).
- RBAC has three roles: `admin`, `moderator`, `user`. Moderator inherits user permissions. All protected routes use `Depends(get_current_user)`, admin-only routes additionally use `Depends(require_admin)`.

**Background processing pipeline:**
1. Episode upload → `transcribe_episode` ARQ task → faster-whisper → Ollama summary + chapters
2. Video upload → `transcode_and_transcribe_video` ARQ task → FFmpeg (thumbnail, HLS, audio) → faster-whisper → VTT subtitles
3. Browser recording → WebM chunks uploaded → `merge_recording_chunks` ARQ task → FFmpeg concat → triggers step 2

**Storage (MinIO):**
- `wecast-media` – episode audio, video originals, thumbnails, VTT subtitles
- `wecast-hls` – HLS segments and manifests
- `wecast-recordings` – raw WebM recording chunks

**Test setup (`tests/conftest.py`):**
- Session-scoped `setup_database` creates all tables once, drops after session.
- Autouse `clean_tables` fixture TRUNCATEs all data tables before each test.
- `client` fixture overrides `get_db` with a per-test `AsyncSession`.
- Pre-built fixtures: `admin_user`, `moderator_user`, `regular_user`, and matching `auth_headers`, `mod_headers`, `user_headers`.

### Frontend (`frontend/`)

**Next.js 15 App Router** with TypeScript and Tailwind CSS.

```
src/
  app/
    (auth)/login/    – unauthenticated login page
    (portal)/        – authenticated portal (dashboard, podcasts, videos, record)
    embed/episode/[id]/  – embeddable iframe player
    embed/video/[id]/    – embeddable iframe player
    s/[code]/        – short URL redirect handler
  components/
    AuthProvider.tsx     – session bootstrap (cookie refresh on mount), AuthContext provider
    media/
      AudioPlayer.tsx    – accessible podcast player
      VideoPlayer.tsx    – HLS player via hls.js
      ScreenRecorder.tsx – browser-based screen + mic recorder (like Loom)
      TranscriptView.tsx – searchable/scrollable transcript viewer
  lib/
    api.ts           – typed fetch client; stores access token in memory; auto-retries on 401 via cookie refresh
    auth.ts          – AuthContext definition + useAuth() hook + formatDuration()
  types/index.ts     – shared TypeScript interfaces for all API entities
```

**Auth state:** `AuthProvider` attempts a silent refresh on mount to restore sessions. Access token is kept in module-level memory (not localStorage) to avoid XSS leaks. The `useAuth()` hook provides `{ user, loading, login, logout }` to any component.

**API calls:** All requests go through `src/lib/api.ts`. On a 401, `tryRefresh()` is called once using the HTTP-only refresh cookie, then the original request is retried.

**Next.js config note:** `redirect_slashes=False` is set in FastAPI to prevent 307 redirects when Next.js strips trailing slashes from API calls.

### Deployment (production)

Nginx proxies:
- `/api/` → FastAPI on port 8000 (rate-limited: 60 req/s general, 5 req/min on `/auth/login`)
- `/media/hls/` → MinIO directly (rewrites to `wecast-hls` bucket, cached 1h)
- `/s/<code>` → FastAPI short URL handler
- Everything else → Next.js on port 3000

Systemd units in `systemd/`: `wecast-api.service`, `wecast-frontend.service`, `wecast-minio.service`, `wecast-worker.service`.

## Key Configuration

All backend config is read from `.env` via pydantic-settings (see `.env.example` for all variables). The most critical settings for local development:

| Variable | Dev default |
|---|---|
| `DATABASE_URL` | `postgresql+asyncpg://wecast:wecast_dev@localhost:5432/wecast` |
| `SECRET_KEY` | must be set (generate: `openssl rand -hex 32`) |
| `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` | `wecast_admin` / `wecast_dev_secret` (matches docker-compose) |
| `LOCAL_ADMIN_PASSWORD` | set to bootstrap the first admin account |
| `LDAP_ENABLED` | set to `false` for local-only dev |
| `DEBUG` | `true` to enable `/api/docs` |
