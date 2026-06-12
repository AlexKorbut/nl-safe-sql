#!/bin/bash

# GoogleSaas VPS Deployment Script
# One-command setup for production deployment
# Usage: ./deploy-vps.sh <domain> <repo-url>
# Example: ./deploy-vps.sh yourdomain.com https://github.com/AlexKorbut/nl-safe-sql.git

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Validate arguments
if [ -z "$1" ] || [ -z "$2" ]; then
    log_error "Usage: $0 <domain> <repo-url>"
    echo "Example: $0 yourdomain.com https://github.com/AlexKorbut/nl-safe-sql.git"
    exit 1
fi

DOMAIN=$1
REPO_URL=$2
APP_DIR="/opt/google-saas"
DATA_DIR="/var/lib/google-saas"
BACKUP_DIR="/backups"

log_info "Starting deployment..."
log_info "Domain: $DOMAIN"
log_info "Repository: $REPO_URL"
log_info "App directory: $APP_DIR"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    log_error "This script must be run as root"
    exit 1
fi

# Step 1: Update system
log_info "Step 1: Updating system packages..."
apt-get update
apt-get upgrade -y
log_success "System packages updated"
echo ""

# Step 2: Install dependencies
log_info "Step 2: Installing dependencies..."

# Check Node.js
if ! command -v node &> /dev/null; then
    log_info "Installing Node.js 22..."
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get install -y nodejs
else
    NODE_VERSION=$(node -v)
    log_success "Node.js $NODE_VERSION already installed"
fi

# Install Caddy
if ! command -v caddy &> /dev/null; then
    log_info "Installing Caddy..."
    apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
    curl -1sLf 'https://dl.smallstep.com/gh-release/cli/gh-release-header/v0.24.4/step-cli_amd64.deb' -o step.deb
    apt-get install -y caddy
else
    CADDY_VERSION=$(caddy -version | head -n1)
    log_success "Caddy already installed: $CADDY_VERSION"
fi

# Install SQLite tools
apt-get install -y sqlite3

log_success "Dependencies installed"
echo ""

# Step 3: Create directories and user
log_info "Step 3: Setting up directories and user..."

if ! id -u google-saas > /dev/null 2>&1; then
    useradd -m -s /bin/bash -d "$APP_DIR" google-saas
    log_success "User 'google-saas' created"
else
    log_success "User 'google-saas' already exists"
fi

mkdir -p "$APP_DIR"
mkdir -p "$DATA_DIR"
mkdir -p "$BACKUP_DIR"

chown -R google-saas:google-saas "$APP_DIR"
chown -R google-saas:google-saas "$DATA_DIR"
chown -R google-saas:google-saas "$BACKUP_DIR"
chmod 755 "$DATA_DIR"
chmod 755 "$BACKUP_DIR"

log_success "Directories created and permissions set"
echo ""

# Step 4: Clone repository
log_info "Step 4: Cloning repository..."

if [ -d "$APP_DIR/.git" ]; then
    log_warn "Repository already exists, pulling latest changes..."
    cd "$APP_DIR"
    sudo -u google-saas git fetch origin
    sudo -u google-saas git reset --hard origin/main
else
    rm -rf "$APP_DIR"
    mkdir -p "$APP_DIR"
    sudo -u google-saas git clone "$REPO_URL" "$APP_DIR"
fi

log_success "Repository cloned/updated"
echo ""

# Step 5: Install dependencies
log_info "Step 5: Installing Node dependencies..."

cd "$APP_DIR"
sudo -u google-saas npm install --production

log_success "Dependencies installed"
echo ""

# Step 6: Create .env file (if not exists)
log_info "Step 6: Checking environment configuration..."

if [ ! -f "$APP_DIR/.env" ]; then
    log_warn ".env file not found. Creating template..."

    # Check if NEXTAUTH_SECRET was passed as env var
    NEXTAUTH_SECRET="${NEXTAUTH_SECRET:-}"
    if [ -z "$NEXTAUTH_SECRET" ]; then
        NEXTAUTH_SECRET=$(openssl rand -base64 32)
        log_warn "Generated NEXTAUTH_SECRET. Update your deployment notes."
    fi

    cat > "$APP_DIR/.env" << EOF
# GoogleSaas Environment Configuration
# Generated on $(date)

# ============ CORE (REQUIRED) ============
NODE_ENV=production
NEXTAUTH_SECRET=$NEXTAUTH_SECRET
DATABASE_PATH=$DATA_DIR/app.db
PORT=3000

# ============ EMAIL (REQUIRED) ============
# Get from https://resend.com
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=noreply@$DOMAIN

# ============ AUDITS (REQUIRED) ============
# Get from https://developers.google.com/speed/docs/insights/v5/get-started
PSI_API_KEY=your_psi_api_key_here

# ============ AI ANALYSIS (OPTIONAL) ============
# Get from https://platform.openai.com/api-keys
OPENAI_API_KEY=sk_your_key_here
OPENAI_MODEL=gpt-4o-mini

# ============ PAYMENTS (OPTIONAL) ============
# Get from https://stripe.com/dashboard/apikeys
STRIPE_SECRET_KEY=sk_test_or_live_key
STRIPE_PUBLISHABLE_KEY=pk_test_or_live_key
STRIPE_WEBHOOK_SECRET=whsec_test_or_live_key
STRIPE_PRICE_REPORT_UNLOCK=price_1234...
STRIPE_PRICE_PRO_MONTHLY=price_5678...
STRIPE_PRICE_AGENCY_MONTHLY=price_9999...

# ============ AUDIT SETTINGS ============
AUDIT_CONCURRENCY=3
FREE_AUDITS_PER_DAY=3
AUDIT_TIMEOUT=120000
ENFORCE_FREE_TIER=false
EOF

    chmod 600 "$APP_DIR/.env"
    chown google-saas:google-saas "$APP_DIR/.env"

    log_warn "Template .env created at $APP_DIR/.env"
    log_warn "⚠️  IMPORTANT: Edit .env and set your actual API keys!"
    echo ""
    log_warn "Waiting 30 seconds before continuing (give you time to edit .env)..."
    sleep 30
else
    log_success ".env already exists"
fi

echo ""

# Step 7: Database setup
log_info "Step 7: Setting up database..."

cd "$APP_DIR"
sudo -u google-saas npm run db:migrate

log_success "Database migrated"
echo ""

# Step 8: Production build
log_info "Step 8: Building for production..."

cd "$APP_DIR"
sudo -u google-saas npm run build

log_success "Production build complete"
echo ""

# Step 9: Set up systemd service
log_info "Step 9: Setting up systemd service..."

cat > /etc/systemd/system/google-saas.service << 'EOF'
[Unit]
Description=GoogleSaas Audit Service
After=network.target
StartLimitIntervalSec=60
StartLimitBurst=3

[Service]
Type=simple
User=google-saas
Group=google-saas
WorkingDirectory=/opt/google-saas
EnvironmentFile=/opt/google-saas/.env
ExecStart=/usr/bin/node /opt/google-saas/.next/standalone/server.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

# Security hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/google-saas

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable google-saas
systemctl start google-saas

# Wait for service to start
sleep 2

if systemctl is-active --quiet google-saas; then
    log_success "Systemd service started"
else
    log_error "Systemd service failed to start"
    systemctl status google-saas
    exit 1
fi

echo ""

# Step 10: Configure Caddy
log_info "Step 10: Configuring Caddy reverse proxy..."

cat > /etc/caddy/Caddyfile << EOF
$DOMAIN {
    reverse_proxy localhost:3000 {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }

    # Security headers
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        X-XSS-Protection "1; mode=block"
        Referrer-Policy "strict-origin-when-cross-origin"
        Permissions-Policy "geolocation=(), microphone=(), camera=()"
    }

    encode gzip
}
EOF

systemctl restart caddy

# Wait for Caddy to start
sleep 2

log_success "Caddy configured and restarted"
echo ""

# Step 11: Verify deployment
log_info "Step 11: Verifying deployment..."

# Wait a moment for everything to settle
sleep 3

# Test health endpoint
if curl -s -f https://$DOMAIN/api/health > /dev/null 2>&1; then
    log_success "Health endpoint responding"
else
    log_warn "Health endpoint not responding yet, this is normal (cert auto-renewal may be in progress)"
fi

# Check service status
if systemctl is-active --quiet google-saas; then
    log_success "Service is running"
else
    log_error "Service is not running"
    journalctl -u google-saas -n 20
    exit 1
fi

echo ""

# Step 12: Set up backups
log_info "Step 12: Setting up automatic backups..."

cat > /etc/cron.d/google-saas-backup << EOF
# Daily backup of GoogleSaas database at 2 AM
0 2 * * * google-saas cp $DATA_DIR/app.db $BACKUP_DIR/app.db.\$(date +\%Y\%m\%d) 2>/dev/null || true
# Keep only 7 days of backups
0 3 * * * find $BACKUP_DIR -name "app.db.*" -mtime +7 -delete 2>/dev/null || true
EOF

log_success "Backup cron job configured"
echo ""

# Step 13: Set up firewall
log_info "Step 13: Configuring firewall..."

if command -v ufw &> /dev/null; then
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw --force enable
    log_success "Firewall configured (allow SSH, HTTP, HTTPS only)"
else
    log_warn "UFW not available, skipping firewall configuration"
fi

echo ""
echo -e "${BLUE}================================${NC}"
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo -e "${BLUE}================================${NC}"
echo ""
echo -e "${BLUE}Important Next Steps:${NC}"
echo ""
echo "1. Edit environment configuration:"
echo "   sudo nano $APP_DIR/.env"
echo "   - Set RESEND_API_KEY (from https://resend.com)"
echo "   - Set PSI_API_KEY (from Google PageSpeed Insights)"
echo "   - Set other optional keys (Stripe, OpenAI, etc.)"
echo ""
echo "2. Restart the service:"
echo "   sudo systemctl restart google-saas"
echo ""
echo "3. Test the deployment:"
echo "   curl https://$DOMAIN/api/health"
echo "   Visit https://$DOMAIN in your browser"
echo ""
echo "4. Monitor logs:"
echo "   sudo journalctl -u google-saas -f"
echo ""
echo "5. Check database:"
echo "   sudo sqlite3 $DATA_DIR/app.db .tables"
echo ""
echo -e "${YELLOW}⚠️  Remember to update .env with your actual API keys!${NC}"
echo ""
