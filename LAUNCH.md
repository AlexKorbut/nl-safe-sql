# GoogleSaas — Pre-Launch Checklist

**Version**: 0.1.0  
**Status**: Ready for Production  
**Date**: 2026-06-12

---

## Prerequisites (Required before launch)

### 1. Environment & Infrastructure ✓
- [ ] VPS provisioned (Hetzner, DigitalOcean, or equivalent)
  - [ ] Ubuntu 22.04+ LTS
  - [ ] Minimum 2GB RAM, 20GB SSD
  - [ ] SSH access configured
- [ ] Domain registered and DNS configured
  - [ ] A record points to VPS IP
  - [ ] Whois privacy enabled (if desired)
- [ ] SSL certificate ready (Caddy auto-obtains Let's Encrypt)

### 2. API Keys & Credentials ✓

**REQUIRED** (service won't start without these):
- [ ] `PSI_API_KEY` — PageSpeed Insights
  - Get at: https://developers.google.com/speed/docs/insights/v5/get-started
  - Quota: 25,000 requests/day (free)
- [ ] `RESEND_API_KEY` — Email delivery
  - Get at: https://resend.com
  - Test with: `curl -X GET https://api.resend.com/emails -H "Authorization: Bearer YOUR_KEY"`
- [ ] `NEXTAUTH_SECRET` — JWT signing
  - Generate: `openssl rand -base64 32`
- [ ] `RESEND_FROM_EMAIL` — Sender address
  - Must be verified domain on Resend
  - Recommended: `noreply@yourdomain.com`

**RECOMMENDED** (enables payments):
- [ ] `STRIPE_SECRET_KEY` — Payment processing
  - Get at: https://dashboard.stripe.com/apikeys
  - Use test key initially: `sk_test_...`
  - Switch to live key before accepting real payments
- [ ] `STRIPE_PUBLISHABLE_KEY` — Frontend integration
  - Use corresponding test/live key
- [ ] `STRIPE_WEBHOOK_SECRET` — Event webhooks
  - Create at: https://dashboard.stripe.com/webhooks
  - Endpoint: `https://yourdomain.com/api/webhooks/stripe`
- [ ] Stripe pricing IDs created
  - [ ] `STRIPE_PRICE_REPORT_UNLOCK` — Report unlock ($19)
  - [ ] `STRIPE_PRICE_PRO_MONTHLY` — Pro plan ($29/mo)
  - [ ] `STRIPE_PRICE_AGENCY_MONTHLY` — Agency plan ($99/mo)

**OPTIONAL** (for advanced features):
- [ ] `OPENAI_API_KEY` — LLM-powered checks (E-E-A-T, citability)
  - Get at: https://platform.openai.com/api-keys
  - Model: `gpt-4o-mini` (~$0.01 per audit)
  - Optional: can disable if budget is tight

### 3. Build & Testing ✓

```bash
# 1. Run tests
npm test
# Expected: all 31+ tests pass

# 2. Build for production
npm run build
# Expected: ✓ zero TypeScript errors

# 3. Test production bundle locally
NODE_ENV=production npm start
# Visit http://localhost:3000
# Create a test audit, verify SSE progress stream
# Check API endpoints work (GET /api/health)
```

### 4. Database ✓

```bash
# Create data directory
mkdir -p /var/lib/google-saas
chmod 755 /var/lib/google-saas

# Run migrations (safe to run multiple times)
npm run db:migrate
# Expected: ✓ schema created/updated
```

### 5. Environment File ✓

Create `.env` in project root (never commit to git):

```bash
# Copy from template
cp .env.example .env

# Edit .env with your credentials
# Minimum required:
NODE_ENV=production
PSI_API_KEY=your_key_here
RESEND_API_KEY=your_key_here
RESEND_FROM_EMAIL=noreply@yourdomain.com
NEXTAUTH_SECRET=$(openssl rand -base64 32)
DATABASE_PATH=/var/lib/google-saas/app.db

# Stripe (if enabling payments)
STRIPE_SECRET_KEY=sk_test_... or sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_test_... or pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Optional
OPENAI_API_KEY=sk-...
ENFORCE_FREE_TIER=false
```

### 6. Health Checks ✓

Before deploying, verify locally:

```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Test endpoints
curl http://localhost:3000/api/health
# Expected response:
# {"status":"healthy","timestamp":"...","version":"0.1.0","checks":{"database":"ok"}}

# Test auth
curl -X POST http://localhost:3000/api/auth/signin \
  -H 'content-type: application/json' \
  -d '{"email":"test@example.com"}'
# Expected: 200 OK

# Test audit creation
curl -X POST http://localhost:3000/api/audits \
  -H 'content-type: application/json' \
  -d '{"url":"https://google.com"}'
# Expected: {"id":"uuid"}
```

---

## Deployment Steps

### Step 1: Prepare VPS

```bash
# SSH into VPS
ssh root@your-vps-ip

# Update system
apt-get update && apt-get upgrade -y

# Install Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
apt-get install -y nodejs

# Install Caddy (reverse proxy + HTTPS)
apt-get install -y caddy

# Create app directory
mkdir -p /opt/google-saas
mkdir -p /var/lib/google-saas
chmod 755 /var/lib/google-saas

# Create non-root user (security best practice)
useradd -m -s /bin/bash -d /opt/google-saas google-saas
chown -R google-saas:google-saas /opt/google-saas
chown -R google-saas:google-saas /var/lib/google-saas
```

### Step 2: Clone & Deploy

```bash
cd /opt/google-saas

# Clone repository
git clone https://github.com/AlexKorbut/nl-safe-sql.git .

# Or if using private GoogleSaas repo (after migration):
git clone https://github.com/AlexKorbut/GoogleSaas.git .
git checkout main  # or your branch

# Install dependencies
npm install --production

# Create .env (edit with your actual credentials)
cat > .env << 'EOF'
NODE_ENV=production
PSI_API_KEY=your_key_here
RESEND_API_KEY=your_key_here
RESEND_FROM_EMAIL=noreply@yourdomain.com
NEXTAUTH_SECRET=your-random-secret-here-minimum-32-characters
DATABASE_PATH=/var/lib/google-saas/app.db
STRIPE_SECRET_KEY=sk_...
STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_WEBHOOK_SECRET=whsec_...
ENFORCE_FREE_TIER=false
EOF

# Restrict permissions (only owner can read)
chmod 600 .env

# Run migrations
npm run db:migrate

# Build for production
npm run build

# Fix permissions
chown -R google-saas:google-saas /opt/google-saas
```

### Step 3: Set Up systemd Service

```bash
# Create systemd unit file
sudo tee /etc/systemd/system/google-saas.service > /dev/null << 'EOF'
[Unit]
Description=GoogleSaas Audit Service
After=network.target
StartLimitIntervalSec=60
StartLimitBurst=3

[Service]
Type=simple
User=google-saas
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

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable google-saas
sudo systemctl start google-saas

# Verify status
sudo systemctl status google-saas
```

### Step 4: Configure Caddy (Reverse Proxy + HTTPS)

```bash
# Create Caddyfile
sudo tee /etc/caddy/Caddyfile > /dev/null << 'EOF'
yourdomain.com {
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
    
    # Enable gzip compression
    encode gzip
}
EOF

# Restart Caddy
sudo systemctl restart caddy

# Test SSL certificate (auto-renews every 60 days)
# Caddy auto-obtains Let's Encrypt certificate

# Wait a moment, then test
sleep 2
curl -I https://yourdomain.com
# Expected: 200 OK with SSL certificate info
```

### Step 5: Verify Deployment

```bash
# Test health endpoint
curl https://yourdomain.com/api/health
# Expected: {"status":"healthy",...}

# Check logs
sudo journalctl -u google-saas -n 50 -f

# Monitor resource usage
free -h  # Memory
df -h    # Disk

# Test database connection
sudo -u google-saas sqlite3 /var/lib/google-saas/app.db ".tables"
# Expected: lists all tables (audits, users, etc.)
```

---

## Post-Deployment Monitoring

### Daily Checks

```bash
# Check service is running
sudo systemctl status google-saas

# Review recent logs for errors
sudo journalctl -u google-saas -n 100 --no-pager | grep -i error

# Monitor disk usage (SQLite grows over time)
df -h /var/lib/google-saas
# Goal: <80% utilization

# Check certificate renewal logs
sudo journalctl -u caddy | grep "ACME"
```

### Weekly Tasks

```bash
# Backup database
sudo su - google-saas -c "cp /var/lib/google-saas/app.db /backups/app.db.$(date +%Y%m%d).bak"

# Review API error rates
sudo journalctl -u google-saas -n 500 --no-pager | grep -c "error"

# Check for rate-limit spam
sudo journalctl -u google-saas -n 500 --no-pager | grep "Rate limit exceeded"
```

### Monthly Tasks

```bash
# Update Node.js and dependencies
sudo apt-get update && sudo apt-get upgrade -y nodejs

# Update application code
cd /opt/google-saas
git fetch origin main
git diff origin/main  # review changes
git pull origin main
npm install --production
npm run build
npm run db:migrate  # safe: idempotent
sudo systemctl restart google-saas

# Verify Stripe webhook connectivity
# (Manual: trigger test event in Stripe Dashboard)

# Review error logs for patterns
sudo journalctl -u google-saas -n 1000 --no-pager | tail -50
```

---

## Monitoring & Alerting Setup

### Simple Uptime Monitoring (Free)

Option 1: **Healthchecks.io**
```bash
# Create account at https://healthchecks.io
# Add check: GET https://yourdomain.com/api/health
# Cron schedule: */5 * * * *  (every 5 minutes)
# Alert: email or Slack if down
```

Option 2: **UptimeRobot**
```bash
# Create account at https://uptimerobot.com
# Monitor: https://yourdomain.com/api/health
# Check interval: 5 minutes
# Alert threshold: 2 failed checks
```

### Log Aggregation (Optional, Wave 2)

```bash
# Future: set up Sentry for error tracking
npm install @sentry/nextjs
# https://sentry.io/onboarding/

# Future: set up structured logging
npm install pino pino-pretty
```

---

## Security Checklist

- [ ] `.env` file is `.gitignore`'d (never commit secrets)
- [ ] Database file has restrictive permissions (600 or 640)
- [ ] Non-root user runs service (`google-saas` user)
- [ ] HTTPS enforced (Caddy auto-redirects HTTP → HTTPS)
- [ ] Security headers set (HSTS, X-Content-Type-Options, etc.)
- [ ] Firewall configured: only ports 80, 443, 22 open
  ```bash
  sudo ufw default deny incoming
  sudo ufw allow 22
  sudo ufw allow 80
  sudo ufw allow 443
  sudo ufw enable
  ```
- [ ] SSH: disable root login, use SSH keys only
  ```bash
  # Edit /etc/ssh/sshd_config:
  PermitRootLogin no
  PasswordAuthentication no
  PubkeyAuthentication yes
  sudo systemctl restart sshd
  ```
- [ ] Regular backups configured (daily to S3 or local cold storage)
- [ ] Rate limits enforced (3 free audits/day/IP)
- [ ] Stripe webhook secret validated on every request
- [ ] Database queries use parameterized queries (Drizzle ORM ✓)

---

## Rollback Plan (If Issues Arise)

```bash
# If new version causes problems:

# 1. Stop service
sudo systemctl stop google-saas

# 2. Restore previous code
cd /opt/google-saas
git reset --hard HEAD~1  # or git checkout <previous-tag>
npm install --production
npm run build

# 3. Restart
sudo systemctl start google-saas
sudo systemctl status google-saas

# 4. Check logs
sudo journalctl -u google-saas -f
```

---

## Stripe Test Mode (Before Going Live)

### Verify in Dashboard

1. Use **test keys** (starts with `sk_test_`, `pk_test_`)
2. Use **test card numbers**:
   - Visa: `4242 4242 4242 4242`
   - Mastercard: `5555 5555 5555 4444`
   - Amex: `3782 822463 10005`
   - Any future date, any CVC
3. Create test prices in **Stripe Dashboard → Billing → Products**:
   - Name: "Report Unlock", Price: $19, ID: `price_xxx`
   - Name: "Pro Monthly", Price: $29, ID: `price_yyy`
   - Name: "Agency Monthly", Price: $99, ID: `price_zzz`
4. Copy IDs to `.env` as `STRIPE_PRICE_*`

### Switch to Live (Production)

When ready to accept real payments:

1. Update `.env` with **live keys** (`sk_live_`, `pk_live_`)
2. Create live prices in Stripe Dashboard
3. Update `.env` with live price IDs
4. Test one real transaction (low amount) with your own card
5. Redact test transaction from Stripe records if desired
6. **Never expose live keys in logs or error messages**

---

## Launch Timeline

| Task | Duration | Owner |
|---|---|---|
| Prepare VPS & DNS | 30 min | DevOps |
| Gather API keys | 1–2 hours | Lead Dev |
| Deploy code | 15 min | DevOps |
| Verify endpoints | 10 min | QA |
| Configure Stripe | 30 min | Billing |
| Run smoke tests | 20 min | QA |
| **Total** | **~3 hours** | - |

---

## Go/No-Go Criteria

### Green Light (Deploy)
- ✅ All 31+ unit tests pass
- ✅ Health endpoint responds 200
- ✅ Can create audit and receive SSE progress stream
- ✅ Database connection verified
- ✅ Stripe test transaction succeeds
- ✅ Email delivery tested (Resend sandbox)
- ✅ HTTPS certificate valid and auto-renewing
- ✅ No errors in systemd logs for 5 minutes
- ✅ Memory usage stable (<500 MB)

### Red Light (Stop, Fix, Retry)
- ❌ Any test fails
- ❌ Health endpoint returns 5xx
- ❌ Database connection fails
- ❌ HTTPS cert errors
- ❌ Stripe webhook validation fails
- ❌ Email API returns 5xx

---

## Support & Troubleshooting

### Service won't start
```bash
# Check systemd logs
sudo journalctl -u google-saas -n 50

# Try running manually
cd /opt/google-saas
node .next/standalone/server.js

# Common issues:
# - .env missing or invalid syntax
# - Database directory not writable
# - PORT already in use (check: lsof -i :3000)
```

### High memory usage
```bash
# Check what's consuming memory
top -p $(pgrep -f "node.*server.js")

# Restart service (memory is freed)
sudo systemctl restart google-saas

# If persistent: increase swap or VM memory
```

### Slow audits
```bash
# Check if PageSpeed Insights is rate-limited
grep "PSI_API_KEY" /opt/google-saas/.env
# Use dedicated API key (shared keys get throttled)

# Monitor concurrent audits
sudo journalctl -u google-saas | grep "concurrent"

# Increase concurrency if safe (3 is default, max 5 for PSI)
# Edit .env: AUDIT_CONCURRENCY=4
```

### Database corrupted
```bash
# Backup current (corrupted) version
sudo su - google-saas
cp /var/lib/google-saas/app.db /var/lib/google-saas/app.db.corrupted

# Remove and recreate
rm /var/lib/google-saas/app.db
npm run db:migrate

# Data is lost, but schema is restored
```

---

## Launch Checklist Summary

```bash
# Run this before deploying (from project root)
echo "🔍 Pre-launch verification..."

# 1. Tests
npm test 2>/dev/null && echo "✅ Tests pass" || echo "❌ Tests fail"

# 2. Build
npm run build 2>/dev/null && echo "✅ Build success" || echo "❌ Build failed"

# 3. Environment
[ -f .env ] && echo "✅ .env exists" || echo "❌ .env missing"

# 4. Required keys
grep -q "PSI_API_KEY=" .env && echo "✅ PSI_API_KEY set" || echo "❌ PSI_API_KEY missing"
grep -q "RESEND_API_KEY=" .env && echo "✅ RESEND_API_KEY set" || echo "❌ RESEND_API_KEY missing"
grep -q "NEXTAUTH_SECRET=" .env && echo "✅ NEXTAUTH_SECRET set" || echo "❌ NEXTAUTH_SECRET missing"

echo ""
echo "🚀 If all checks above pass, you're ready to deploy!"
```

---

**Status**: All systems ready for production launch.  
**Next Step**: Follow "Deployment Steps" section above.  
**Questions?** Review DEPLOYMENT.md or CLAUDE.md for detailed guidance.
