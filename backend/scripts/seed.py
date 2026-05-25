#!/usr/bin/env python3
"""
WeCast Demo-Datengenerator
==========================
Füllt die Datenbank mit realistischen Beispieldaten für alle Features:
  - Benutzer (Admin, Moderator, User)
  - Podcast-Sendungen mit Episoden + KI-Transkripten
  - Videos (hochgeladen + Bildschirmaufnahmen)
  - Kurz-URLs mit Aufrufzählern
  - LDAP-Gruppen-Mappings

Ausführen:
    cd backend
    python scripts/seed.py

Warnung: Löscht alle bestehenden Daten vor dem Einfügen.
"""

import asyncio
import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path

# Make sure we can import the app from the backend directory
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.core.security import hash_password
from app.models.episode import Episode
from app.models.short_url import ShortUrl
from app.models.show import Show
from app.models.user import LdapGroupMapping, User
from app.models.video import Video
from app.services.url_shortener import encode as b62encode

# ── Helpers ───────────────────────────────────────────────────────────────────

def now(delta_days: int = 0) -> datetime:
    return datetime.now(UTC) + timedelta(days=delta_days)


SAMPLE_TRANSCRIPT = {
    "language": "de",
    "segments": [
        {"start": 0.0,  "end": 12.4, "text": "Herzlich willkommen zu unserem heutigen Podcast. Ich bin froh, dass ihr dabei seid."},
        {"start": 12.4, "end": 28.1, "text": "Heute sprechen wir über die neuesten Entwicklungen in unserem Unternehmen und wie wir gemeinsam die Zukunft gestalten."},
        {"start": 28.1, "end": 45.0, "text": "Zunächst möchte ich auf die Quartalszahlen eingehen, die letzte Woche veröffentlicht wurden."},
        {"start": 45.0, "end": 62.3, "text": "Wir haben in diesem Quartal unsere Ziele übertroffen und konnten den Umsatz um 12 Prozent steigern."},
        {"start": 62.3, "end": 80.5, "text": "Das ist eine großartige Leistung des gesamten Teams, und ich möchte jedem Einzelnen dafür danken."},
        {"start": 80.5, "end": 97.2, "text": "Im nächsten Quartal planen wir die Einführung von drei neuen Produkten, über die ich euch heute informieren möchte."},
        {"start": 97.2, "end": 115.8, "text": "Darüber hinaus werden wir in neue Märkte expandieren und unsere Präsenz in Osteuropa ausbauen."},
        {"start": 115.8, "end": 133.4, "text": "Abschließend möchte ich noch auf die bevorstehenden Team-Events hinweisen. Der Jahresausflug findet nächsten Monat statt."},
    ],
}

SAMPLE_CHAPTERS = [
    {"title": "Begrüßung & Einleitung",     "start_sec": 0},
    {"title": "Quartalszahlen & Highlights", "start_sec": 45},
    {"title": "Neue Produkte & Roadmap",     "start_sec": 97},
    {"title": "Team-Events & Ausblick",      "start_sec": 116},
]

SAMPLE_SUMMARY = (
    "In dieser Episode bespricht der Vorstand die Quartalsergebnisse (12 % Umsatzwachstum), "
    "kündigt drei neue Produkte sowie die Expansion nach Osteuropa an und informiert über "
    "bevorstehende Team-Events inklusive des Jahresausflugs."
)

# ── Main seed function ────────────────────────────────────────────────────────

async def seed():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    Session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    # Ensure all tables exist (idempotent – safe to run multiple times)
    from app.core.database import Base
    print("🏗️  Erstelle Tabellen falls nötig …")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Use a raw connection for the cleanup so a failed statement
    # never poisons the transaction that follows the inserts.
    print("🗑️  Lösche bestehende Daten …")
    async with engine.begin() as conn:
        await conn.execute(text(
            "TRUNCATE audit_logs, refresh_tokens, short_urls, episodes, "
            "videos, shows, ldap_group_mappings, users "
            "RESTART IDENTITY CASCADE"
        ))

    async with Session() as db:
        # ── Benutzer ─────────────────────────────────────────────────────────
        print("👤 Erstelle Benutzer …")

        admin = User(
            username="admin",
            email="admin@company.com",
            display_name="Alexandra Weber",
            password_hash=hash_password("admin123"),
            role="admin",
            is_local_admin=True,
            is_active=True,
            last_login=now(-1),
        )
        mod1 = User(
            username="m.mueller",
            email="m.mueller@company.com",
            display_name="Markus Müller",
            password_hash=hash_password("mod123"),
            role="moderator",
            is_active=True,
            last_login=now(-3),
        )
        mod2 = User(
            username="s.schmidt",
            email="s.schmidt@company.com",
            display_name="Sandra Schmidt",
            password_hash=hash_password("mod123"),
            role="moderator",
            is_active=True,
            last_login=now(-7),
        )
        user1 = User(
            username="t.hoffmann",
            email="t.hoffmann@company.com",
            display_name="Thomas Hoffmann",
            password_hash=hash_password("user123"),
            role="user",
            is_active=True,
            last_login=now(-2),
        )
        user2 = User(
            username="l.braun",
            email="l.braun@company.com",
            display_name="Laura Braun",
            password_hash=hash_password("user123"),
            role="user",
            is_active=True,
        )
        user3 = User(
            username="k.fischer",
            email="k.fischer@company.com",
            display_name="Klaus Fischer",
            password_hash=hash_password("user123"),
            role="user",
            is_active=False,  # deaktivierter Account
        )
        db.add_all([admin, mod1, mod2, user1, user2, user3])
        await db.flush()

        # ── LDAP-Gruppen-Mappings ─────────────────────────────────────────────
        print("🔗 Erstelle LDAP-Gruppen-Mappings …")
        db.add_all([
            LdapGroupMapping(
                group_dn="CN=WeCast-Admins,OU=Groups,DC=company,DC=com",
                role="admin",
            ),
            LdapGroupMapping(
                group_dn="CN=WeCast-Moderators,OU=Groups,DC=company,DC=com",
                role="moderator",
            ),
        ])

        # ── Podcast-Sendungen ─────────────────────────────────────────────────
        print("🎙️  Erstelle Podcast-Sendungen …")

        show_ceo = Show(
            title="CEO Corner",
            slug="ceo-corner",
            description=(
                "Direkt vom Vorstand: monatliche Updates zu Strategie, Zahlen und Vision. "
                "Alexandra Weber spricht offen über Herausforderungen und Erfolge."
            ),
            is_public=False,
            owner_id=admin.id,
        )
        show_tech = Show(
            title="TechTalk Intern",
            slug="techtalk-intern",
            description=(
                "Unser internes Technik-Podcast. Das Entwicklungsteam diskutiert neue "
                "Technologien, Code-Reviews und Architekturentscheidungen."
            ),
            is_public=False,
            owner_id=mod1.id,
        )
        show_onboard = Show(
            title="Onboarding Essentials",
            slug="onboarding-essentials",
            description=(
                "Alles was neue Mitarbeiterinnen und Mitarbeiter wissen müssen: "
                "Prozesse, Tools, Kultur und Ansprechpartner."
            ),
            is_public=True,
            owner_id=mod2.id,
        )
        show_hr = Show(
            title="HR Aktuell",
            slug="hr-aktuell",
            description=(
                "Personalthemen, Benefits-Updates, Gesundheitsangebote und "
                "alles rund um Arbeitnehmerrechte."
            ),
            is_public=False,
            owner_id=mod2.id,
        )
        db.add_all([show_ceo, show_tech, show_onboard, show_hr])
        await db.flush()

        # ── Episoden – CEO Corner ─────────────────────────────────────────────
        print("🎧 Erstelle Episoden …")

        ep_ceo_1 = Episode(
            show_id=show_ceo.id,
            title="Q3 2024: Wachstum trotz Gegenwind",
            slug="q3-2024-wachstum",
            description="Alexandra Weber analysiert die Q3-Ergebnisse und erklärt, warum wir trotz schwieriger Marktlage 12 % Wachstum erzielen konnten.",
            duration_sec=1423,
            status="published",
            transcript_status="done",
            transcript_json=SAMPLE_TRANSCRIPT,
            summary=SAMPLE_SUMMARY,
            chapters_json=SAMPLE_CHAPTERS,
            published_at=now(-30),
            created_by=admin.id,
        )
        ep_ceo_2 = Episode(
            show_id=show_ceo.id,
            title="Unsere Nachhaltigkeitsstrategie 2025",
            slug="nachhaltigkeit-2025",
            description="Welche konkreten Maßnahmen planen wir, um bis 2025 klimaneutral zu werden? Der CEO gibt Einblicke in unseren Fahrplan.",
            duration_sec=982,
            status="published",
            transcript_status="done",
            transcript_json=SAMPLE_TRANSCRIPT,
            summary="Überblick über die Klimaneutralitätsstrategie mit Meilensteinen für 2024 und 2025.",
            chapters_json=[
                {"title": "Status quo & Ausgangslage",    "start_sec": 0},
                {"title": "Maßnahmen Energie & Gebäude",  "start_sec": 180},
                {"title": "Lieferkette & Beschaffung",    "start_sec": 420},
                {"title": "Mitarbeiterprogramme",         "start_sec": 720},
            ],
            published_at=now(-60),
            created_by=admin.id,
        )
        ep_ceo_3 = Episode(
            show_id=show_ceo.id,
            title="New Work: Hybrides Arbeiten bei uns",
            slug="new-work-hybrides-arbeiten",
            description="Rückblick auf ein Jahr hybrides Arbeitsmodell – was hat funktioniert, was ändern wir?",
            duration_sec=1876,
            status="published",
            transcript_status="done",
            transcript_json=SAMPLE_TRANSCRIPT,
            summary="Evaluation des hybriden Arbeitsmodells nach einem Jahr mit konkreten Anpassungen.",
            chapters_json=SAMPLE_CHAPTERS,
            published_at=now(-90),
            created_by=admin.id,
        )
        ep_ceo_draft = Episode(
            show_id=show_ceo.id,
            title="Jahresrückblick 2024 [Entwurf]",
            slug="jahresrueckblick-2024",
            description="Aufnahme läuft noch – wird Ende Dezember veröffentlicht.",
            duration_sec=None,
            status="draft",
            transcript_status="pending",
            created_by=admin.id,
        )

        # ── Episoden – TechTalk ───────────────────────────────────────────────
        ep_tech_1 = Episode(
            show_id=show_tech.id,
            title="Von REST zu GraphQL: Unsere API-Migration",
            slug="rest-zu-graphql",
            description="Das Backend-Team diskutiert die Entscheidung für GraphQL und teilt Learnings aus der Migration.",
            duration_sec=2341,
            status="published",
            transcript_status="done",
            transcript_json=SAMPLE_TRANSCRIPT,
            summary="Technische Deep-Dive in die GraphQL-Migration: Entscheidungsgründe, Pitfalls und Performance-Gewinne.",
            chapters_json=[
                {"title": "Warum GraphQL?",             "start_sec": 0},
                {"title": "Migrationsplan & Tooling",   "start_sec": 480},
                {"title": "Schema Design Patterns",     "start_sec": 960},
                {"title": "Performance & Caching",      "start_sec": 1500},
                {"title": "Fazit & Empfehlungen",       "start_sec": 2100},
            ],
            published_at=now(-14),
            created_by=mod1.id,
        )
        ep_tech_2 = Episode(
            show_id=show_tech.id,
            title="Kubernetes vs. systemd: Was passt zu uns?",
            slug="kubernetes-vs-systemd",
            description="Infra-Team und Dev-Team diskutieren kontrovers: brauchen wir wirklich K8s oder reicht systemd für unser Setup?",
            duration_sec=3187,
            status="published",
            transcript_status="done",
            transcript_json=SAMPLE_TRANSCRIPT,
            summary="Pro-Contra-Diskussion zu Kubernetes vs. systemd für mittelgroße Deployments.",
            chapters_json=SAMPLE_CHAPTERS,
            published_at=now(-45),
            created_by=mod1.id,
        )
        ep_tech_3 = Episode(
            show_id=show_tech.id,
            title="Code Review Best Practices",
            slug="code-review-best-practices",
            description="Wie machen wir Code Reviews effizienter? Unsere neuen Guidelines und Tooling-Empfehlungen.",
            duration_sec=1654,
            status="published",
            transcript_status="processing",
            published_at=now(-7),
            created_by=mod1.id,
        )

        # ── Episoden – Onboarding ─────────────────────────────────────────────
        ep_onboard_1 = Episode(
            show_id=show_onboard.id,
            title="Willkommen an Bord! Dein erster Tag",
            slug="willkommen-erster-tag",
            description="Alles Wichtige für deinen ersten Tag: Zugänge, Tools, Ansprechpartner und erste Schritte.",
            duration_sec=843,
            status="published",
            transcript_status="done",
            transcript_json=SAMPLE_TRANSCRIPT,
            summary="Kompakter Überblick für neue Mitarbeiter: IT-Setup, wichtige Kontakte und erste Aufgaben.",
            chapters_json=[
                {"title": "IT & Zugänge",           "start_sec": 0},
                {"title": "Unsere Tools im Überblick", "start_sec": 180},
                {"title": "Dein Team kennenlernen", "start_sec": 420},
                {"title": "Erste Woche: Was erwartet dich?", "start_sec": 640},
            ],
            published_at=now(-180),
            created_by=mod2.id,
        )
        ep_onboard_2 = Episode(
            show_id=show_onboard.id,
            title="Unsere Unternehmenskultur & Werte",
            slug="unternehmenskultur-werte",
            description="Was uns als Unternehmen ausmacht: unsere drei Kernwerte und wie sie im Alltag gelebt werden.",
            duration_sec=1124,
            status="published",
            transcript_status="done",
            transcript_json=SAMPLE_TRANSCRIPT,
            summary="Beschreibung der drei Unternehmenswerte: Offenheit, Verantwortung und Innovation mit konkreten Beispielen.",
            chapters_json=SAMPLE_CHAPTERS,
            published_at=now(-180),
            created_by=mod2.id,
        )
        ep_onboard_3 = Episode(
            show_id=show_onboard.id,
            title="Benefits & Sozialleistungen",
            slug="benefits-sozialleistungen",
            description="Betriebliche Altersvorsorge, Jobrad, Gesundheitsbudget und weitere Benefits im Überblick.",
            duration_sec=762,
            status="published",
            transcript_status="done",
            transcript_json=SAMPLE_TRANSCRIPT,
            summary="Vollständige Übersicht aller Mitarbeiter-Benefits mit Anmeldelinks und Kontaktadressen.",
            chapters_json=SAMPLE_CHAPTERS,
            published_at=now(-180),
            created_by=mod2.id,
        )

        # ── Episoden – HR ─────────────────────────────────────────────────────
        ep_hr_1 = Episode(
            show_id=show_hr.id,
            title="Krankmeldung & Arbeitsunfähigkeit: So geht's",
            slug="krankmeldung-arbeitsunfaehigkeit",
            description="Schritt-für-Schritt: Was muss ich tun, wenn ich krank bin? AU-Schein, Krankmeldung beim Team, Fristen.",
            duration_sec=487,
            status="published",
            transcript_status="done",
            transcript_json=SAMPLE_TRANSCRIPT,
            summary="Kurze Anleitung zur korrekten Krankmeldung mit allen relevanten Fristen und Ansprechpartnern.",
            chapters_json=SAMPLE_CHAPTERS,
            published_at=now(-21),
            created_by=mod2.id,
        )
        ep_hr_2 = Episode(
            show_id=show_hr.id,
            title="Urlaubsplanung & Genehmigung",
            slug="urlaubsplanung-genehmigung",
            description="Urlaubsantrag stellen, Resturlaub, Sonderurlaub und was bei Überschneidungen im Team gilt.",
            duration_sec=634,
            status="published",
            transcript_status="pending",
            published_at=now(-35),
            created_by=mod2.id,
        )

        db.add_all([
            ep_ceo_1, ep_ceo_2, ep_ceo_3, ep_ceo_draft,
            ep_tech_1, ep_tech_2, ep_tech_3,
            ep_onboard_1, ep_onboard_2, ep_onboard_3,
            ep_hr_1, ep_hr_2,
        ])
        await db.flush()

        # ── Videos ───────────────────────────────────────────────────────────
        print("🎬 Erstelle Videos …")

        vid_allhands = Video(
            title="All-Hands Meeting Oktober 2024",
            slug="all-hands-oktober-2024",
            description="Vollständige Aufzeichnung des All-Hands Meetings vom 15. Oktober 2024 mit Präsentationen aller Abteilungen.",
            duration_sec=5423,
            transcode_status="done",
            transcript_status="done",
            status="published",
            is_recording=False,
            published_at=now(-45),
            owner_id=admin.id,
        )
        vid_product = Video(
            title="Produktdemo: Release 4.2",
            slug="produktdemo-release-4-2",
            description="Live-Demo der neuen Features in Release 4.2: Verbessertes Dashboard, neue API-Endpoints und Performance-Optimierungen.",
            duration_sec=1876,
            transcode_status="done",
            transcript_status="done",
            status="published",
            is_recording=False,
            published_at=now(-14),
            owner_id=mod1.id,
        )
        vid_training = Video(
            title="Excel für Fortgeschrittene – Workshop",
            slug="excel-fortgeschrittene-workshop",
            description="3-stündiger Workshop zu Pivot-Tabellen, SVERWEIS, Power Query und Makros. Aufzeichnung vom HR-Training.",
            duration_sec=10847,
            transcode_status="done",
            transcript_status="done",
            status="published",
            is_recording=False,
            published_at=now(-60),
            owner_id=mod2.id,
        )
        vid_rec1 = Video(
            title="Bug-Fix Walkthrough: Login-Issue #4821",
            slug="bugfix-login-issue-4821",
            description="Screencapture-Debugging-Session: Thomas zeigt, wie er den hartnäckigen Login-Bug isoliert und behoben hat.",
            duration_sec=923,
            transcode_status="done",
            transcript_status="done",
            status="published",
            is_recording=True,
            published_at=now(-7),
            owner_id=user1.id,
        )
        vid_rec2 = Video(
            title="Onboarding-Screencast: Jira & Confluence",
            slug="onboarding-jira-confluence",
            description="Schritt-für-Schritt Einführung in unsere Projekt-Tools Jira und Confluence für neue Mitarbeiter.",
            duration_sec=1654,
            transcode_status="done",
            transcript_status="processing",
            status="published",
            is_recording=True,
            published_at=now(-90),
            owner_id=mod2.id,
        )
        vid_processing = Video(
            title="Q4 Kick-Off Präsentation",
            slug="q4-kickoff-praesentation",
            description="Aufzeichnung des Q4 Kick-Off Meetings – wird gerade verarbeitet.",
            duration_sec=None,
            transcode_status="processing",
            transcript_status="pending",
            status="processing",
            is_recording=False,
            owner_id=admin.id,
        )
        vid_draft = Video(
            title="Sicherheitsunterweisung 2025 [Entwurf]",
            slug="sicherheitsunterweisung-2025",
            description="Noch nicht fertig – bitte noch nicht teilen.",
            duration_sec=None,
            transcode_status="pending",
            transcript_status="pending",
            status="draft",
            is_recording=False,
            owner_id=mod2.id,
        )

        db.add_all([
            vid_allhands, vid_product, vid_training,
            vid_rec1, vid_rec2, vid_processing, vid_draft,
        ])
        await db.flush()

        # ── Kurz-URLs ─────────────────────────────────────────────────────────
        print("🔗 Erstelle Kurz-URLs …")

        shorts_data = [
            # (id, target_type, target_id, vanity_slug, visit_count, created_by_id)
            (1,  "episode", ep_ceo_1.id,       "q3-ceo",       342, admin.id),
            (2,  "episode", ep_ceo_2.id,       "nachhaltigkeit", 187, admin.id),
            (3,  "video",   vid_allhands.id,   "all-hands-okt",  891, admin.id),
            (4,  "video",   vid_product.id,    "demo-4-2",       234, mod1.id),
            (5,  "episode", ep_tech_1.id,      "graphql-talk",    98, mod1.id),
            (6,  "episode", ep_onboard_1.id,   "tag1",           567, mod2.id),
            (7,  "video",   vid_training.id,   "excel-ws",       123, mod2.id),
            (8,  "episode", ep_hr_1.id,        None,              45, mod2.id),
            (9,  "video",   vid_rec1.id,       "bugfix-4821",     67, user1.id),
            (10, "episode", ep_tech_2.id,      None,              31, mod1.id),
        ]
        for seq_id, target_type, target_id, vanity, visits, creator_id in shorts_data:
            db.add(ShortUrl(
                code=b62encode(seq_id),
                vanity_slug=vanity,
                target_type=target_type,
                target_id=target_id,
                visit_count=visits,
                created_by=creator_id,
                last_visited_at=now(-1) if visits > 0 else None,
            ))

        await db.commit()

    await engine.dispose()

    print()
    print("✅ Beispieldaten erfolgreich eingefügt!")
    print()
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print("  Zugangsdaten")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print("  👑 Admin       admin      / admin123")
    print("  📝 Moderator   m.mueller  / mod123")
    print("  📝 Moderator   s.schmidt  / mod123")
    print("  👤 User        t.hoffmann / user123")
    print("  👤 User        l.braun    / user123")
    print("  ⛔ Inaktiv     k.fischer  / user123")
    print()
    print("  📻 Sendungen   4 (CEO Corner, TechTalk, Onboarding, HR)")
    print("  🎧 Episoden    12 (davon 1 Entwurf, 1 in Bearbeitung)")
    print("  🎬 Videos      7 (davon 1 in Bearbeitung, 1 Entwurf)")
    print("  🔗 Kurz-URLs   10 (mit Aufrufzählern)")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")


if __name__ == "__main__":
    asyncio.run(seed())
