"""Tests for JWT and password utilities."""

import pytest
from jose import JWTError

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_access_token,
    decode_refresh_token,
    hash_ip,
    hash_password,
    hash_refresh_token,
    verify_password,
)


def test_password_hash_and_verify():
    hashed = hash_password("mysecret")
    assert verify_password("mysecret", hashed)
    assert not verify_password("wrong", hashed)


def test_access_token_roundtrip():
    token = create_access_token(user_id=42, role="moderator")
    payload = decode_access_token(token)
    assert payload["sub"] == "42"
    assert payload["role"] == "moderator"
    assert payload["type"] == "access"


def test_refresh_token_roundtrip():
    raw, token_hash = create_refresh_token(user_id=7)
    assert len(token_hash) == 64  # SHA-256 hex
    payload = decode_refresh_token(raw)
    assert payload["sub"] == "7"
    assert payload["type"] == "refresh"
    # Verify hash matches
    assert hash_refresh_token(raw) == token_hash


def test_access_token_wrong_type_rejected():
    """A refresh token must not pass as access token."""
    raw, _ = create_refresh_token(user_id=1)
    with pytest.raises(JWTError):
        decode_access_token(raw)


def test_ip_hash_is_pseudonymised():
    h = hash_ip("192.168.1.100")
    assert h != "192.168.1.100"
    assert len(h) == 16  # truncated
    # Same IP → same hash (deterministic)
    assert hash_ip("192.168.1.100") == hash_ip("192.168.1.100")
    # Different IPs → different hashes
    assert hash_ip("192.168.1.100") != hash_ip("10.0.0.1")
