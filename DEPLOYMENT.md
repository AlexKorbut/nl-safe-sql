# GoogleSaas — Deployment Guide

## Quick Start (Local Development)

### Prerequisites
- Node.js 22+
- npm/yarn

### Installation

```bash
# Clone and install
git clone https://github.com/AlexKorbut/GoogleSaas.git
cd GoogleSaas
npm install

# Create environment file
cp .env.example .env
```

### Environment Variables

```bash
# Auth & Sessions
NEXTAUTH_SECRET=your-random-secret-here
RESEND_FROM_EMAIL=noreply@yourdomain.com
RESEND_API_KEY=re_xxx...

# PageSpeed Insights (free tier)
PSI_API_KEY=xxx...

# Stripe (optional for testing)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# LLM (optional, for AI checks)
OPENAI_API_KEY=sk-...

# Database (default: SQLite in ./data)
DATABASE_PATH=./data/app.db
```

### Run Locally

```bash
# Database setup
npm run db:migrate

# Dev server (http://localhost:3000)
npm run dev

# Or production build
npm run build
npm run start
```

## Production Deployment

### VPS Setup (Hetzner / DigitalOcean)

```bash
# 1. SSH into VPS
ssh root@your-vps-ip

# 2. Install Node.js
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Clone repo
git clone https://github.com/AlexKorbut/GoogleSaas.git /opt/google-saas
cd /opt/google-saas

# 4. Install dependencies
npm install --production
npm run db:migrate

# 5. Create .env file
cat > .env << EOF
NEXTAUTH_SECRET=$(openssl rand -base64 32)
RESEND_API_KEY=re_...
PSI_API_KEY=...
STRIPE_SECRET_KEY=...
DATABASE_PATH=/var/lib/google-saas/app.db
NODE_ENV=production
PORT=3000
EOF

# 6. Create data directory
sudo mkdir -p /var/lib/google-saas
sudo chown nobody:nogroup /var/lib/google-saas
```

### Systemd Service

```bash
# Create systemd unit
sudo tee /etc/systemd/system/google-saas.service > /dev/null << EOF
[Unit]
Description=GoogleSaas API
After=network.target

[Service]
Type=simple
User=nobody
WorkingDirectory=/opt/google-saas
EnvironmentFile=/opt/google-saas/.env
ExecStart=/usr/bin/node /opt/google-saas/.next/standalone/server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable google-saas
sudo systemctl start google-saas
sudo systemctl status google-saas
```

### HTTPS with Caddy

```bash
# Install Caddy
sudo apt-get install -y caddy

# Create Caddyfile
sudo tee /etc/caddy/Caddyfile > /dev/null << EOF
yourdomain.com {
    reverse_proxy localhost:3000
    encode gzip
}
EOF

# Enable and start
sudo systemctl enable caddy
sudo systemctl restart caddy
```

### Check Service Status

```bash
# View logs
sudo journalctl -u google-saas -f

# Check if running
curl https://yourdomain.com/health || echo "Not ready yet"
```

## Database

### SQLite (Default)

- Stored at `DATABASE_PATH` (default: `./data/app.db`)
- Automatically created and migrated on startup
- Suitable for solo-developer/small scale deployments

### Backup

```bash
# Manual backup
cp ./data/app.db ./data/app.db.backup.$(date +%Y%m%d)

# Automated daily backup (cron)
0 2 * * * cp /var/lib/google-saas/app.db /backups/app.db.$(date +\%Y\%m\%d)
```

## Environment Configuration

### Required
- `NEXTAUTH_SECRET` - Random secret for JWT signing (generate: `openssl rand -base64 32`)
- `RESEND_API_KEY` - Get from [Resend](https://resend.com)
- `PSI_API_KEY` - Get from [Google PageSpeed Insights](https://developers.google.com/speed/docs/insights/v5/get-started)

### Optional
- `STRIPE_SECRET_KEY` - For payments (get from [Stripe](https://stripe.com))
- `OPENAI_API_KEY` - For LLM checks (get from [OpenAI](https://platform.openai.com))
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - For Google OAuth (optional)

## Monitoring

### Health Check

```bash
curl https://yourdomain.com/api/health
```

### Logs

```bash
# Application logs
sudo journalctl -u google-saas -n 100

# Caddy logs
sudo journalctl -u caddy -n 50
```

### Metrics

- No external monitoring configured
- Add Prometheus/Grafana for production monitoring
- Add Sentry for error tracking

## Troubleshooting

### Service won't start
```bash
# Check logs
sudo journalctl -u google-saas -n 50

# Verify .env exists and is readable
ls -la /opt/google-saas/.env

# Test Node app directly
cd /opt/google-saas
node .next/standalone/server.js
```

### Database issues
```bash
# Check file exists
ls -la /var/lib/google-saas/app.db

# Check permissions
sudo chown nobody:nogroup /var/lib/google-saas/app.db

# Reset if corrupted
rm /var/lib/google-saas/app.db
npm run db:migrate
```

### HTTPS not working
```bash
# Check Caddy status
sudo systemctl status caddy

# Check firewall
sudo ufw status

# Open ports 80 and 443
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

## Scaling

### Multi-process (Using PM2)

```bash
# Install PM2
sudo npm install -g pm2

# Start app
pm2 start "node .next/standalone/server.js" --name google-saas

# Monitor
pm2 monit
```

### Load Balancing (Nginx)

If deploying multiple instances:

```nginx
upstream google_saas {
    server localhost:3000;
    server localhost:3001;
}

server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://google_saas;
    }
}
```

## Security

### Production Checklist

- [ ] Change `NEXTAUTH_SECRET` to a random value
- [ ] Enable HTTPS (Caddy auto-renews Let's Encrypt)
- [ ] Set secure database permissions (read-only for app user)
- [ ] Enable firewall (ufw or iptables)
- [ ] Set up log rotation for systemd journal
- [ ] Enable monitoring and alerts
- [ ] Regular database backups (daily)
- [ ] Keep Node.js and dependencies updated

### Environment Variables Security

```bash
# Don't commit .env file
echo ".env" >> .gitignore

# Use secret manager for VPS
# Option 1: systemd EnvironmentFile
# Option 2: AWS Secrets Manager
# Option 3: Vault
# Option 4: 1Password
```

## Updates & Maintenance

### Update Application

```bash
cd /opt/google-saas
git pull origin main
npm install
npm run build
sudo systemctl restart google-saas
```

### Database Migrations

```bash
npm run db:migrate
```

Migrations are applied automatically on startup, but you can force them explicitly.

## Support

For issues or questions:
- Check logs: `sudo journalctl -u google-saas -f`
- Review `.env` configuration
- Test API endpoints: `curl http://localhost:3000/api/audits`
- See CLAUDE.md for development guide
