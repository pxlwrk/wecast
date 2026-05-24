"""Ollama LLM service for AI text enrichment (summaries, chapters)."""

import structlog
from ollama import Client

from app.core.config import settings

log = structlog.get_logger(__name__)


def _get_client() -> Client:
    return Client(host=settings.OLLAMA_BASE_URL)


def generate_summary(transcript_text: str, title: str) -> str:
    """Generate a concise summary of a podcast episode or video."""
    if not settings.OLLAMA_ENABLED or not transcript_text.strip():
        return ""

    prompt = f"""Du bist ein hilfreicher Assistent für ein Unternehmens-Medienportal.

Fasse den folgenden Inhalt des Mediums "{title}" in 3-5 Sätzen zusammen.
Schreibe sachlich, präzise und auf Deutsch. Vermeide Floskeln.

Transkript:
{transcript_text[:6000]}

Zusammenfassung:"""

    try:
        client = _get_client()
        response = client.generate(
            model=settings.OLLAMA_MODEL,
            prompt=prompt,
            options={"temperature": 0.3, "num_predict": 300},
        )
        return response["response"].strip()
    except Exception as exc:
        log.warning("ollama.summary_failed", error=str(exc))
        return ""


def generate_chapters(segments: list[dict], title: str) -> list[dict]:
    """
    Suggest chapter markers based on topic changes in the transcript.
    Returns list of {title: str, start_sec: float}.
    """
    if not settings.OLLAMA_ENABLED or not segments:
        return []

    # Build a condensed representation
    text_with_times = "\n".join(
        f"[{seg['start']:.0f}s] {seg['text']}" for seg in segments[::3][:80]
    )

    prompt = f"""Du analysierst ein Transkript des Mediums "{title}".
Identifiziere 3-8 thematische Abschnitte und schlage Kapitelmarken vor.

Format (JSON-Array, kein Markdown):
[{{"title": "Einleitung", "start_sec": 0}}, ...]

Transkript (mit Zeitstempeln in Sekunden):
{text_with_times}

Kapitel:"""

    try:
        import json

        client = _get_client()
        response = client.generate(
            model=settings.OLLAMA_MODEL,
            prompt=prompt,
            options={"temperature": 0.2, "num_predict": 500},
        )
        raw = response["response"].strip()
        # Extract JSON array from response
        start = raw.find("[")
        end = raw.rfind("]") + 1
        if start >= 0 and end > start:
            chapters = json.loads(raw[start:end])
            return chapters
    except Exception as exc:
        log.warning("ollama.chapters_failed", error=str(exc))
    return []
