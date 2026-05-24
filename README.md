# WeCast – Unternehmensinternes Media-Portal

WeCast ist ein vollständig selbst-gehostetes Portal für Podcasts und Videos mit lokaler KI-Transkription, Active Directory SSO und Barrierefreiheit nach WCAG 2.1 AA.

## Features

| Feature | Details |
|---|---|
| 🔐 **Authentication** | LDAP/LDAPS (Active Directory) + lokaler Admin-Fallback |
| 👥 **Rollen** | Admin, Moderator, Benutzer (via AD-Gruppen konfigurierbar) |
| 🎙️ **Podcasts** | Mehrere Sendungen, Upload, RSS-Feed, Kapitel |
| 🎥 **Videos** | Upload, HLS-Streaming, Untertitel |
| 📹 **Aufnahmen** | Browser-basierter Screen-Recorder (wie Loom) |
| 🤖 **KI-Transkription** | faster-whisper (lokal, GPU-optional) |
| ✍️ **KI-Texte** | Ollama (llama3.2) für Zusammenfassungen und Kapitel |
| 🔗 **Kurz-URLs** | `wecast.company.com/s/abc123` oder Vanity-Slugs |
| 📺 **Embedding** | iframe-kompatibler Player für Intranet-Seiten |
| ♿ **Barrierefreiheit** | WCAG 2.1 AA – Tastatur, ARIA, Untertitel standardmäßig AN |
| 🔒 **Privacy by Design** | Keine externen CDNs, IP-Pseudonymisierung, Audit-Log |

## Tech Stack

- **Backend**: Python 3.12 + FastAPI + SQLAlchemy (async)
- **Frontend**: Next.js 15 + TypeScript + Tailwind CSS
- **Datenbank**: PostgreSQL 16
- **Cache/Queue**: Redis 7 + ARQ
- **Objektspeicher**: MinIO (S3-kompatibel)
- **Medienverarbeitung**: FFmpeg
- **Transkription**: faster-whisper
- **KI-Texte**: Ollama (llama3.2)
- **Auth**: LDAP/LDAPS (ldap3)
- **Deployment**: Bare Metal / VM + systemd + Nginx

## Schnellstart (Entwicklung)

### Backend

```bash
cd backend
python3.12 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env
# .env anpassen (DB, MinIO, LDAP)

# Datenbank starten (PostgreSQL + Redis vorausgesetzt)
alembic upgrade head

# API starten
uvicorn app.main:app --reload --port 8000

# ARQ Worker (separates Terminal)
arq app.tasks.worker.WorkerSettings
```

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev   # http://localhost:3000
```

## Produktiv-Deployment (Bare Metal)

```bash
sudo bash scripts/install.sh
# Danach: /opt/wecast/backend/.env anpassen
```

Weitere Details: [Installationsanleitung](scripts/install.sh)

## Konfiguration

### LDAP / Active Directory

```env
LDAP_URL=ldaps://ad.company.com:636
LDAP_BIND_DN=cn=wecast-svc,ou=ServiceAccounts,dc=company,dc=com
LDAP_BIND_PASSWORD=...
LDAP_BASE_DN=dc=company,dc=com
LDAP_ADMIN_GROUP_DN=CN=WeCast-Admins,OU=Groups,DC=company,DC=com
LDAP_MODERATOR_GROUP_DN=CN=WeCast-Moderators,OU=Groups,DC=company,DC=com
```

### Rollen-Mapping

- **Admin**: Mitglieder von `LDAP_ADMIN_GROUP_DN`
- **Moderator**: Mitglieder von `LDAP_MODERATOR_GROUP_DN`
- **Benutzer**: Alle weiteren authentifizierten Benutzer

Zusätzliche Gruppen können über die Admin-UI (`/admin`) konfiguriert werden.

### Ollama-Modell

```env
OLLAMA_MODEL=llama3.2   # Oder: mistral, gemma2, etc.
```

### Whisper-Qualität

```env
WHISPER_MODEL=medium    # tiny|base|small|medium|large-v3
WHISPER_DEVICE=cpu      # cpu|cuda
WHISPER_LANGUAGE=de     # Leer = Automatisch
```

## API-Dokumentation

Im Debug-Modus (`DEBUG=true`) unter `http://localhost:8000/api/docs` verfügbar.

## Tests

```bash
cd backend && pytest tests/ -v
cd frontend && npm test
```

## Barrierefreiheit

- Alle Player-Funktionen per Tastatur bedienbar
- Untertitel standardmäßig aktiviert
- ARIA-Labels und Rollen für alle interaktiven Elemente
- Sichtbare Fokus-Indikatoren (kein `:focus { outline: none }`)
- Skip-Link "Zum Hauptinhalt springen" als erstes Element
- Kontrastverhältnis ≥ 4.5:1 (WCAG AA)

## Datenschutz & Sicherheit

- Keine externen CDNs oder Tracking-Dienste
- IP-Adressen werden gehasht gespeichert (SHA-256 + Salt)
- HTTPS-only mit HSTS
- CSP-Header auf allen Seiten
- Rate-Limiting auf Login-Endpunkt (5 req/min)
- Refresh-Token-Rotation (Replay-Schutz)
- Audit-Log für alle CRUD-Operationen

## Lizenz

Proprietär – nur für internen Unternehmenseinsatz.
