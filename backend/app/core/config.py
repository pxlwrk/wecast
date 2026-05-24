"""Application configuration via pydantic-settings (reads from .env)."""

from functools import lru_cache
from typing import List, Optional

from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # ── Application ──────────────────────────────────────────────────────────
    APP_NAME: str = "WeCast"
    APP_ENV: str = "production"
    APP_BASE_URL: str = "http://localhost:8000"
    SECRET_KEY: str
    DEBUG: bool = False

    # ── Database ─────────────────────────────────────────────────────────────
    DATABASE_URL: str

    # ── Redis ─────────────────────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"

    # ── MinIO ─────────────────────────────────────────────────────────────────
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str
    MINIO_SECRET_KEY: str
    MINIO_SECURE: bool = False
    MINIO_BUCKET_MEDIA: str = "wecast-media"
    MINIO_BUCKET_HLS: str = "wecast-hls"
    MINIO_BUCKET_RECORDINGS: str = "wecast-recordings"

    # ── LDAP / Active Directory ───────────────────────────────────────────────
    LDAP_ENABLED: bool = True
    LDAP_URL: str = "ldaps://localhost:636"
    LDAP_BIND_DN: str = ""
    LDAP_BIND_PASSWORD: str = ""
    LDAP_BASE_DN: str = "dc=company,dc=com"
    LDAP_USER_FILTER: str = "(sAMAccountName={username})"
    LDAP_GROUP_ATTR: str = "memberOf"
    LDAP_ADMIN_GROUP_DN: str = ""
    LDAP_MODERATOR_GROUP_DN: str = ""
    LDAP_TLS_VALIDATE: bool = True
    LDAP_TLS_CA_CERTS_FILE: Optional[str] = None

    # ── JWT ───────────────────────────────────────────────────────────────────
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    JWT_ALGORITHM: str = "HS256"

    # ── Ollama ────────────────────────────────────────────────────────────────
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.2"
    OLLAMA_ENABLED: bool = True

    # ── Whisper / Transcription ───────────────────────────────────────────────
    WHISPER_MODEL: str = "medium"
    WHISPER_DEVICE: str = "cpu"
    WHISPER_COMPUTE_TYPE: str = "int8"
    WHISPER_LANGUAGE: str = "de"

    # ── Local Admin Fallback ──────────────────────────────────────────────────
    LOCAL_ADMIN_USERNAME: str = "admin"
    LOCAL_ADMIN_PASSWORD: str = ""

    # ── Audit & Privacy ───────────────────────────────────────────────────────
    AUDIT_LOG_ENABLED: bool = True
    IP_HASH_SALT: str = "changeme"

    # ── CORS ──────────────────────────────────────────────────────────────────
    CORS_ORIGINS: str = "http://localhost:3000"

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
