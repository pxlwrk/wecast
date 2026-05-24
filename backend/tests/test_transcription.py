"""Tests for transcription format utilities (no model loading required)."""

import pytest

from app.services.transcription import segments_to_srt, segments_to_vtt


SEGMENTS = [
    {"start": 0.0, "end": 3.5, "text": "Guten Morgen und herzlich willkommen."},
    {"start": 3.5, "end": 7.2, "text": "Heute sprechen wir über das neue Projekt."},
    {"start": 7.2, "end": 12.0, "text": "Lass uns direkt beginnen."},
]


def test_vtt_header():
    vtt = segments_to_vtt(SEGMENTS)
    assert vtt.startswith("WEBVTT")


def test_vtt_timecodes():
    vtt = segments_to_vtt(SEGMENTS)
    assert "00:00:00.000 --> 00:00:03.500" in vtt
    assert "00:00:03.500 --> 00:00:07.200" in vtt


def test_vtt_contains_text():
    vtt = segments_to_vtt(SEGMENTS)
    assert "Guten Morgen" in vtt
    assert "direkt beginnen" in vtt


def test_srt_format():
    srt = segments_to_srt(SEGMENTS)
    assert "1\n" in srt
    assert "00:00:00,000 --> 00:00:03,500" in srt
    assert "Guten Morgen" in srt


def test_empty_segments():
    assert "WEBVTT" in segments_to_vtt([])
    assert segments_to_srt([]) == ""
