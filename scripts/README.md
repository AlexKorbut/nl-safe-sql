# GoogleSaas Deployment Scripts

This directory contains scripts to help deploy GoogleSaas to production.

## Quick Start

### 1. Pre-Launch Verification (Local)

Run this locally before deploying:

```bash
./scripts/pre-launch-check.sh
```

This script:
- ✅ Verifies Node.js 22+ is installed
- ✅ Checks all dependencies are installed
- ✅ Runs full test suite
- ✅ Builds production bundle
- ✅ Validates `.env` file and required API keys
- ✅ Checks database setup
- ✅ Verifies security settings (HTTPS, .gitignore, etc.)

**Expected output**: Green checkmarks for all required items, warnings for optional items.

### 2. One-Command VPS Deployment

Deploy to a fresh Ubuntu 22.04+ VPS with one command:

```bash
# SSH into your VPS as root
ssh root@your-vps-ip

# Copy and run deployment script
# Option 1: If you have the repo already cloned
cd /path/to/repo
sudo ./scripts/deploy-vps.sh yourdomain.com https://github.com/AlexKorbut/nl-safe-sql.git

# Option 2: If starting fresh (run from any directory)
curl -fsSL https://raw.githubusercontent.com/AlexKorbut/nl-safe-sql/main/scripts/deploy-vps.sh | \
  bash -s yourdomain.com https://github.com/AlexKorbut/nl-safe-sql.git
```

This script will automatically:
- ✅ Update system packages (Ubuntu)
- ✅ Install Node.js 22, Caddy, SQLite
- ✅ Create `google-saas` user and directories
- ✅ Clone repository
- ✅ Create `.env` file (template)
- ✅ Run database migrations
- ✅ Build production bundle
- ✅ Configure systemd service
- ✅ Set up Caddy reverse proxy with auto HTTPS
- ✅ Configure firewall (UFW)
- ✅ Set up automated daily backups

**Expected duration**: ~5–10 minutes depending on VPS speed

## File Reference

### Scripts

| Script | Purpose | Usage |
|---|---|---|
| `pre-launch-check.sh` | Local verification before deployment | `./pre-launch-check.sh` |
| `deploy-vps.sh` | Automated VPS deployment (Ubuntu) | `./deploy-vps.sh <domain> <repo-url>` |

### Configuration Templates

| File | Purpose | Destination |
|---|---|---|
| `google-saas.service` | systemd service file | `/etc/systemd/system/google-saas.service` |
| `Caddyfile.example` | Caddy reverse proxy config | `/etc/caddy/Caddyfile` |

Deploy them automatically via `deploy-vps.sh`, or manually if needed:

```bash
# Manual setup (if not using deploy-vps.sh)
sudo cp scripts/google-saas.service /etc/systemd/system/
sudo cp scripts/Caddyfile.example /etc/caddy/Caddyfile

# Edit domain in Caddyfile
sudo nano /etc/caddy/Caddyfile

# Reload
sudo systemctl daemon-reload
sudo systemctl restart google-saas caddy
```

## Step-by-Step Manual Deployment

If you prefer to deploy manually instead of using `deploy-vps.sh`:

### 1. Prepare VPS

```bash
# SSH into VPS
ssh root@your-vps-ip

# Update system
apt-get update && apt-get upgrade -y

# Install dependencies
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs caddy sqlite3

# Create directories
mkdir -p /opt/google-saas
mkdir -p /var/lib/google-saas
mkdir -p /backups
```

### 2. Create User & Clone

```bash
# Create app user
useradd -m -s /bin/bash -d /opt/google-saas google-saas

# Clone repo
cd /opt/google-saas
git clone https://github.com/AlexKorbut/nl-safe-sql.git .

# Set ownership
chown -R google-saas:google-saas /opt/google-saas
chown -R google-saas:google-saas /var/lib/google-saas
```

### 3. Configure Environment

```bash
# Create .env with your credentials
cp /opt/google-saas/.env.example /opt/google-saas/.env
nano /opt/google-saas/.env

# Set permissions
chmod 600 /opt/google-saas/.env
chown google-saas:google-saas /opt/google-saas/.env
```

### 4. Build & Migrate

```bash
cd /opt/google-saas
npm install --production
npm run db:migrate
npm run build
```

### 5. Set Up systemd

```bash
# Copy service file
cp /opt/google-saas/scripts/google-saas.service /etc/systemd/system/

# Enable and start
systemctl daemon-reload
systemctl enable google-saas
systemctl start google-saas

# Verify
systemctl status google-saas
```

### 6. Configure Caddy

```bash
# Update Caddyfile
cp /opt/google-saas/scripts/Caddyfile.example /etc/caddy/Caddyfile
nano /etc/caddy/Caddyfile  # Edit domain

# Restart
systemctl restart caddy
```

### 7. Test

```bash
# Health check (will get cert error first time, wait 30s)
curl -k https://yourdomain.com/api/health

# View logs
journalctl -u google-saas -f
```

## Troubleshooting

### Service won't start

```bash
# Check logs
sudo journalctl -u google-saas -n 50

# Check if .env exists and is readable
ls -la /opt/google-saas/.env

# Try running manually
cd /opt/google-saas
sudo -u google-saas node .next/standalone/server.js
```

### HTTPS certificate issues

```bash
# Check Caddy status
sudo systemctl status caddy

# View Caddy logs
sudo journalctl -u caddy -n 50

# Verify firewall allows 80/443
sudo ufw status
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

### Database issues

```bash
# Check if database exists
ls -la /var/lib/google-saas/app.db

# Check permissions
sudo chown google-saas:google-saas /var/lib/google-saas/app.db
sudo chmod 640 /var/lib/google-saas/app.db

# Verify tables
sudo sqlite3 /var/lib/google-saas/app.db ".tables"
```

### High memory usage

```bash
# Check what's running
top -p $(pgrep -f "node.*server.js")

# Restart service (clears memory)
sudo systemctl restart google-saas

# Monitor after restart
watch -n 2 'ps aux | grep node'
```

## Monitoring

### Check Status

```bash
# Is service running?
sudo systemctl status google-saas

# Recent errors?
sudo journalctl -u google-saas -n 50 --grep=error

# Performance
sudo ps aux | grep "node.*server.js"
free -h
df -h
```

### Automated Health Checks

Using cron to check health endpoint every 5 minutes:

```bash
# Add to crontab
*/5 * * * * curl -f https://yourdomain.com/api/health || systemctl restart google-saas
```

### Log Rotation (Important for long-term)

Systemd journal auto-rotates, but you can configure:

```bash
# Edit /etc/systemd/journald.conf
SystemMaxUse=1G
MaxRetentionDays=30
```

## Updating Application

```bash
# Pull latest code
cd /opt/google-saas
git fetch origin main
git pull origin main

# Install updated dependencies
npm install --production

# Run any new migrations
npm run db:migrate

# Build
npm run build

# Restart service
sudo systemctl restart google-saas

# Verify
sudo systemctl status google-saas
```

## Backup & Recovery

### Manual Backup

```bash
# Backup database
sudo cp /var/lib/google-saas/app.db /backups/app.db.$(date +%Y%m%d-%H%M%S).bak

# Backup entire app directory
sudo tar -czf /backups/google-saas-$(date +%Y%m%d).tar.gz /opt/google-saas/
```

### Automated Backups

Configured by `deploy-vps.sh` in `/etc/cron.d/google-saas-backup`:

```bash
# Daily backup at 2 AM
0 2 * * * google-saas cp /var/lib/google-saas/app.db /backups/app.db.$(date +\%Y\%m\%d)

# Cleanup old backups (keep 7 days)
0 3 * * * find /backups -name "app.db.*" -mtime +7 -delete
```

### Restore from Backup

```bash
# Stop service
sudo systemctl stop google-saas

# Restore database
sudo cp /backups/app.db.20260615.bak /var/lib/google-saas/app.db
sudo chown google-saas:google-saas /var/lib/google-saas/app.db

# Restart
sudo systemctl start google-saas
```

## Security Hardening (Post-Deployment)

```bash
# 1. Disable SSH password auth (use keys only)
sudo sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart sshd

# 2. Fail2ban (optional, protects against brute-force)
sudo apt-get install -y fail2ban
sudo systemctl enable fail2ban

# 3. Check open ports
sudo ss -tulpn

# 4. Verify HTTPS security
curl -I https://yourdomain.com
# Check headers for security settings
```

## Stripe Integration (After Deployment)

### Test Mode (Initially)

```bash
# Use test keys in .env:
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Create test prices in Stripe Dashboard
# Use test cards: 4242 4242 4242 4242
```

### Production Mode (When Ready)

```bash
# Update .env with live keys:
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...

# Restart service
sudo systemctl restart google-saas

# Create live prices in Stripe Dashboard
```

## Support

For issues or questions:

1. Check logs: `sudo journalctl -u google-saas -f`
2. Review LAUNCH.md in project root
3. Review DEPLOYMENT.md for detailed guidance
4. Check CLAUDE.md for development documentation

---

**Last updated**: 2026-06-12  
**Version**: 0.1.0
