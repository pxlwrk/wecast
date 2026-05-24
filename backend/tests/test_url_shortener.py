"""Tests for Base62 URL shortener."""

import pytest

from app.services.url_shortener import decode, encode, make_short_url


def test_encode_decode_roundtrip():
    for n in [1, 42, 100, 9999, 1_000_000]:
        assert decode(encode(n)) == n


def test_encode_zero():
    assert encode(0) == "0"


def test_encode_unique():
    codes = [encode(i) for i in range(1, 1000)]
    assert len(set(codes)) == 999  # All unique


def test_make_short_url():
    url = make_short_url("https://wecast.company.com", "abc123")
    assert url == "https://wecast.company.com/s/abc123"


def test_make_short_url_strips_trailing_slash():
    url = make_short_url("https://wecast.company.com/", "xyz")
    assert url == "https://wecast.company.com/s/xyz"
