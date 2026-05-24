"""MinIO object storage service abstraction."""

import io
from datetime import timedelta
from typing import Optional

import structlog
from minio import Minio
from minio.error import S3Error

from app.core.config import settings

log = structlog.get_logger(__name__)


def _get_client() -> Minio:
    return Minio(
        settings.MINIO_ENDPOINT,
        access_key=settings.MINIO_ACCESS_KEY,
        secret_key=settings.MINIO_SECRET_KEY,
        secure=settings.MINIO_SECURE,
    )


def ensure_buckets() -> None:
    """Create required buckets if they don't exist. Called at app startup."""
    client = _get_client()
    for bucket in (
        settings.MINIO_BUCKET_MEDIA,
        settings.MINIO_BUCKET_HLS,
        settings.MINIO_BUCKET_RECORDINGS,
    ):
        if not client.bucket_exists(bucket):
            client.make_bucket(bucket)
            log.info("storage.bucket_created", bucket=bucket)


def upload_bytes(
    bucket: str,
    object_key: str,
    data: bytes,
    content_type: str = "application/octet-stream",
) -> str:
    """Upload raw bytes and return the object key."""
    client = _get_client()
    client.put_object(
        bucket,
        object_key,
        io.BytesIO(data),
        length=len(data),
        content_type=content_type,
    )
    log.info("storage.uploaded", bucket=bucket, key=object_key, size=len(data))
    return object_key


def upload_file(
    bucket: str,
    object_key: str,
    file_path: str,
    content_type: str = "application/octet-stream",
) -> str:
    """Upload a local file (path) to MinIO."""
    client = _get_client()
    client.fput_object(bucket, object_key, file_path, content_type=content_type)
    log.info("storage.file_uploaded", bucket=bucket, key=object_key)
    return object_key


def download_file(bucket: str, object_key: str, dest_path: str) -> None:
    """Download an object to a local file path."""
    client = _get_client()
    client.fget_object(bucket, object_key, dest_path)


def get_presigned_upload_url(
    bucket: str,
    object_key: str,
    expires_hours: int = 1,
) -> str:
    """Generate a presigned PUT URL for direct client-side upload."""
    client = _get_client()
    url = client.presigned_put_object(
        bucket,
        object_key,
        expires=timedelta(hours=expires_hours),
    )
    return url


def get_presigned_download_url(
    bucket: str,
    object_key: str,
    expires_minutes: int = 60,
) -> str:
    """Generate a presigned GET URL for temporary access."""
    client = _get_client()
    url = client.presigned_get_object(
        bucket,
        object_key,
        expires=timedelta(minutes=expires_minutes),
    )
    return url


def delete_object(bucket: str, object_key: str) -> None:
    client = _get_client()
    try:
        client.remove_object(bucket, object_key)
    except S3Error as exc:
        log.warning("storage.delete_failed", bucket=bucket, key=object_key, error=str(exc))
