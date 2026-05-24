#!/usr/bin/env bash
# WeCast Installation Script for Ubuntu 24.04 LTS
# Usage: sudo bash scripts/install.sh
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()    { echo -e "${GREEN}[INFO]${NC} $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

INSTALL_DIR=/opt/wecast
DATA_DIR=/data/wecast-minio
WECAST_USER=wecast

# ── Checks ────────────────────────────────────────────────────────────────────
[[ $EUID -ne 0 ]] && error "Root privileges required"
[[ ! -f /etc/os-release ]] || source /etc/os-release
info "Installing WeCast on $PRETTY_NAME"

# ── System User ───────────────────────────────────────────────────────────────
if ! id "$WECAST_USER" &>/dev/null; then
    useradd --system --create-home --home-dir /opt/wecast --shell /usr/sbin/nologin "$WECAST_USER"
    info "Created system user: $WECAST_USER"
fi

# ── System Packages ───────────────────────────────────────────────────────────
info "Installing system packages…"
apt-get update -qq
apt-get install -y --no-install-recommends \
    postgresql postgresql-client \
    redis-server \
    nginx \
    ffmpeg \
    python3.12 python3.12-venv python3.12-dev \
    nodejs npm \
    curl wget git \
    ca-certificates \
    build-essential \
    libpq-dev

# ── MinIO ─────────────────────────────────────────────────────────────────────
info "Installing MinIO…"
if [[ ! -f /usr/local/bin/minio ]]; then
    ARCH=$(dpkg --print-architecture)
    wget -q "https://dl.min.io/server/minio/release/linux-${ARCH}/minio" -O /usr/local/bin/minio
    chmod +x /usr/local/bin/minio
fi
mkdir -p "$DATA_DIR"
chown -R "$WECAST_USER:$WECAST_USER" "$DATA_DIR"
info "MinIO installed: $(minio --version)"

# ── Ollama ────────────────────────────────────────────────────────────────────
info "Installing Ollama…"
if ! command -v ollama &>/dev/null; then
    curl -fsSL https://ollama.ai/install.sh | sh
fi
systemctl enable --now ollama
info "Pulling Ollama model (llama3.2)…"
ollama pull llama3.2 || warn "Could not pull llama3.2 – please run manually: ollama pull llama3.2"

# ── PostgreSQL ────────────────────────────────────────────────────────────────
info "Configuring PostgreSQL…"
systemctl enable --now postgresql
sudo -u postgres psql -c "CREATE USER wecast WITH PASSWORD 'CHANGE_ME_NOW';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE wecast OWNER wecast;" 2>/dev/null || true
info "PostgreSQL database 'wecast' ready"

# ── Application Files ─────────────────────────────────────────────────────────
info "Copying application files…"
mkdir -p "$INSTALL_DIR"
rsync -a --exclude='.git' --exclude='node_modules' --exclude='.venv' \
    "$(dirname "$0")/../" "$INSTALL_DIR/"
chown -R "$WECAST_USER:$WECAST_USER" "$INSTALL_DIR"

# ── Python Backend ────────────────────────────────────────────────────────────
info "Setting up Python backend…"
cd "$INSTALL_DIR/backend"
sudo -u "$WECAST_USER" python3.12 -m venv .venv
sudo -u "$WECAST_USER" .venv/bin/pip install -q --upgrade pip wheel
sudo -u "$WECAST_USER" .venv/bin/pip install -q -e ".[prod]"

if [[ ! -f "$INSTALL_DIR/backend/.env" ]]; then
    cp "$INSTALL_DIR/backend/.env.example" "$INSTALL_DIR/backend/.env"
    # Generate secret key
    SECRET=$(openssl rand -hex 32)
    IP_SALT=$(openssl rand -hex 16)
    sed -i "s/CHANGE_ME_generate_with_openssl_rand_-hex_32/$SECRET/" "$INSTALL_DIR/backend/.env"
    sed -i "s/CHANGE_ME_generate_with_openssl_rand_-hex_16/$IP_SALT/" "$INSTALL_DIR/backend/.env"
    warn "IMPORTANT: Edit $INSTALL_DIR/backend/.env with your LDAP settings!"
fi

# ── Node.js Frontend ──────────────────────────────────────────────────────────
info "Building Next.js frontend…"
cd "$INSTALL_DIR/frontend"
sudo -u "$WECAST_USER" npm ci --silent
sudo -u "$WECAST_USER" npm run build

# ── Database Migrations ───────────────────────────────────────────────────────
info "Running database migrations…"
cd "$INSTALL_DIR/backend"
sudo -u "$WECAST_USER" .venv/bin/alembic upgrade head

# ── systemd Services ──────────────────────────────────────────────────────────
info "Installing systemd services…"
cp "$INSTALL_DIR/systemd/"*.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable wecast-api wecast-worker wecast-frontend wecast-minio
systemctl restart wecast-minio
systemctl restart wecast-api
systemctl restart wecast-worker
systemctl restart wecast-frontend

# ── Nginx ─────────────────────────────────────────────────────────────────────
info "Configuring Nginx…"
cp "$INSTALL_DIR/nginx/wecast.conf" /etc/nginx/sites-available/wecast
ln -sf /etc/nginx/sites-available/wecast /etc/nginx/sites-enabled/wecast
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  WeCast installation complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo ""
echo "  Next steps:"
echo "  1. Edit /opt/wecast/backend/.env (LDAP settings, passwords)"
echo "  2. Configure TLS certificate in /etc/ssl/wecast/"
echo "  3. Update nginx/wecast.conf with your domain name"
echo "  4. Restart services: systemctl restart wecast-api wecast-frontend"
echo ""
warn "Default admin password is in .env – change it immediately!"
