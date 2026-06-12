# GoogleSaas — Google Search & Ads Readiness Auditor

## Что это

SaaS-сервис: пользователь вводит URL → получает 0–100 готовность по Google Search (AI Overviews citability, E-E-A-T, Core Web Vitals, структурированные данные, индексируемость) и Google Ads (Quality Score, доверие, мобильный опыт) в едином отчёте EN+RU.

**MVP готов и протестирован**: 45 проверок, SSE-стриминг, in-process очередь, гейтинг free/paid на сервере.

---

## Быстрый старт локально

### Переменные окружения

```bash
cp .env.example .env
```

Добавь в `.env`:
- `PSI_API_KEY`: PageSpeed Insights API key (бесплатно, 25k запросов/день) — [получить тут](https://developers.google.com/speed/docs/insights/v5/get-started)
- `OPENAI_API_KEY`: (опционально) для LLM-проверок E-E-A-T/цитируемости — используй gpt-4o-mini (~$0.01/аудит)

```bash
PSI_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
```

### Развёртывание локально

```bash
npm install
npm run db:migrate    # создаёт SQLite схему в ./data/app.db
npm run dev           # http://localhost:3000
```

Откройте браузер, введите URL, смотрите live-прогресс SSE → отчёт с баллами и рекомендациями.

### Тесты

```bash
npm test              # 31 юнит-тест (checks, scoring, URL validation)
```

### Production-сборка

```bash
npm run build         # standalone Next.js bundle (~250MB)
npm run start         # single-process server
```

---

## Архитектура

### Движок аудита (src/server/audit/)

**collect → check → score**

1. **Collectors** (параллель, one-shot I/O):
   - `fetchPage`: fetch + following redirects manually
   - `parseHtml`: cheerio extraction (title, H1s, headings, main text, links, images, JSON-LD, OG tags, viewport, robots meta)
   - `robots`: robots.txt parser (robots-parser pkg) — Googlebot allowed?
   - `sitemap`: XML-парсинг первых 2k URLs (есть ли текущий URL)
   - `psi`: PageSpeed Insights (mobile + desktop) — Lighthouse + CrUX field data (LCP, INP, CLS)
   - `links`: HEAD-проверка ~10 случайных внутренних ссылок на 4xx/5xx
   - `llm`: один batched OpenAI structured-output вызов (E-E-A-T, helpfulness, citability, clarity, adsRelevance)

2. **Checks** (~42, pure functions):
   - **Technical** (10): CWV (LCP/INP/CLS), Lighthouse performance, TTFB, HTTPS, viewport, image optimization, render-blocking
   - **Indexability** (7): HTTP status, robots.txt, meta noindex, canonical, sitemap, crawlable links, lang
   - **Structured data** (5): JSON-LD presence, Organization/WebSite markup, page type, OG/Twitter meta
   - **Content / E-E-A-T** (10): title, meta description, H1, content depth, image alt, author byline, freshness, about/contact pages, heading structure + 4 LLM checks
   - **Ads landing** (10): contact info, privacy policy, speed, mobile usability, interstitial heuristic, CTA/form, trust signals, broken links, popunder/redirect, LLM relevance

3. **Scoring**:
   - Проверка: score 0–100, status pass/warn/fail/na
   - Категория: weighted average (na исключаются, веса перенормируются)
   - SEO: technical 0.25 + indexability 0.20 + structured 0.15 + content 0.40
   - Ads: собственный набор с техническими checks
   - Overall: mean(SEO, Ads)
   - **Все веса в одном файле**: `src/server/audit/weights.ts` — туни здесь

### Очередь и прогресс (src/server/jobs/runner.ts)

- **In-process FIFO**: concurrency 2–3 (PageSpeed API медленный)
- **SSE streaming** прогресса клиенту (шаги: fetching → parsing → robots → sitemap → links → psi_mobile/desktop → llm → scoring)
- **Fallback polling**: если SSE обрывается, клиент poll'ит `/api/audits/[id]` каждые 3 сек
- **Restart recovery**: при перезагрузке приложения queued/running аудиты автоматически перезапускаются
- **Rate limit**: 3 бесплатных проверки/день/IP (не требует auth)

### Гейтинг free/paid (src/server/report/serialize.ts)

- ВСЕ проверки выполняются всегда (cost = const)
- Гейтится **отображение** на сервере: функция `serializeReport(checks, entitlement) → SerializedReport`
- **Free** (анонимный + заявленный plan: "free"):
  - Оба скора (SEO + Ads) + категории
  - Top-3 проблемы с полными деталями
  - Остальные проверки: имя + статус (✓/!/✕) + размытые детали (blur CSS)
- **Paid** (unlocked flag в БД):
  - Всё развёрнуто: score, params, evidence (raw data), recommendations
  - Публичная sharable ссылка
  - (Позже) PDF-экспорт

Полный JSON никогда не уходит браузеру до auth+billing. `ENFORCE_FREE_TIER=true` (prod) / `false` (dev — всё visible).

### i18n (next-intl, EN+RU)

- Сегмент `/[locale]/` (параметризует все страницы)
- Каталоги: `messages/en.json`, `messages/ru.json`
- Все check names, descriptions, recommendations — keys в каталогах (переводы параллельны)
- Клиент: `useTranslations("checks")` → `t("cwv-lcp.name")`, `t("cwv-lcp.rec")`
- Серверные компоненты: `await getTranslations(namespace)`

---

## API

### POST /api/audits

Создать аудит.

```bash
curl -X POST http://localhost:3000/api/audits \
  -H 'content-type: application/json' \
  -d '{"url":"https://example.com"}'
```

**Ответ:**
```json
{"id": "uuid"}
```

**Rate limiting**: 3/день/IP (анонимные). Статус 429 если исчерпан.

### GET /api/audits/[id]

Получить статус/отчёт.

```bash
curl http://localhost:3000/api/audits/uuid
```

**Ответы:**

Когда `status: queued|running`:
```json
{
  "id": "uuid",
  "url": "https://example.com",
  "status": "queued|running",
  "progress": {"step": "fetching", "pct": 5},
  "error": null
}
```

Когда `status: done`:
```json
{
  "id": "uuid",
  "url": "https://example.com",
  "status": "done",
  "report": {
    "scores": {"overall": 68, "seo": 67, "ads": 68, "categories": {...}},
    "checks": [
      {"id": "cwv-lcp", "category": "technical", "status": "pass", "score": 100, "locked": false, ...}
    ],
    "topIssueIds": ["content-depth", "ads-contact-info"],
    "entitlement": "free"
  }
}
```

Когда `status: failed`:
```json
{
  "id": "uuid",
  "url": "https://example.com",
  "status": "failed",
  "error": "unreachable|blocked|non_html|internal"
}
```

### GET /api/audits/[id]/events (SSE)

Live прогресс-стрим.

```bash
curl http://localhost:3000/api/audits/uuid/events
# data: {"step":"fetching","pct":5}
# data: {"step":"parsing","pct":15}
# ...
# data: {"step":"done","pct":100}
```

Клиент (React):
```typescript
const es = new EventSource(`/api/audits/${id}/events`);
es.onmessage = (msg) => {
  const event = JSON.parse(msg.data);
  setProgress(event.pct);
  if (event.step === "done") router.push(`/report/${id}`);
};
```

---

## БД (SQLite + Drizzle)

### Таблицы

**users** (для future auth):
- `id` (PK)
- `email`, `name`, `locale`
- `stripe_customer_id`, `plan` (free|pro), `plan_expires_at`
- `created_at`

**audits** (основная таблица):
- `id` (PK, UUID)
- `user_id` (FK, NULL for anonymous)
- `url`, `normalized_url` (SSRF-safe)
- `status` (queued|running|done|failed)
- `progress_json` (latest ProgressEvent)
- `result_json` (array NamedCheckResult, NULL until done)
- `scores_json` (AuditScores, NULL until done)
- `error` (reason if failed)
- `unlocked` (BOOL — paid report unlock)
- `created_at`, `finished_at`

**purchases** (для future Stripe):
- `id` (PK)
- `user_id`, `audit_id` (NULLable для subscription)
- `stripe_session_id`
- `type` (report_unlock | subscription)
- `amount` (cents)
- `created_at`

**rate_limits** (анонимный лимит):
- `ip_hash` (sha256 prefix)
- `day` (YYYY-MM-DD)
- `count`

**Auth.js tables** (для future magic link):
- `accounts`, `sessions`, `users`, `verification_tokens` (стандарт)

### Миграции

```bash
npm run db:migrate     # drizzle-kit push — применяет схему
```

Схема хранится как `drizzle/migrations/`, не требует версионирования на VCS.

---

## Развёртывание

### Требования

- **Node.js** 22+
- **SQLite** (встроен в better-sqlite3)
- **Caddy** или другой reverse proxy (для HTTPS, если на VPS)

### На простой VPS (Hetzner, DigitalOcean)

```bash
# SSH в VPS
ssh root@your-vps-ip

# Клонируем репозиторий
git clone https://github.com/AlexKorbut/GoogleSaas.git /opt/google-saas
cd /opt/google-saas

# Переменные окружения
cat > .env << EOF
PSI_API_KEY=your_key
OPENAI_API_KEY=your_key
DATABASE_PATH=/var/lib/google-saas/app.db
PORT=3000
ENFORCE_FREE_TIER=false
EOF

# БД
mkdir -p /var/lib/google-saas
npm install
npm run db:migrate

# systemd сервис (или pm2)
cat > /etc/systemd/system/google-saas.service << EOF
[Unit]
Description=GoogleReady SaaS
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/google-saas
ExecStart=/usr/bin/node /opt/google-saas/.next/standalone/server.js
Restart=always
RestartSec=10

Environment="NODE_ENV=production"
Environment="PORT=3000"

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable google-saas
systemctl start google-saas

# Caddy reverse proxy
cat > /etc/caddy/Caddyfile << EOF
yourdomain.com {
  reverse_proxy localhost:3000
}
EOF

systemctl restart caddy
```

Готово — https://yourdomain.com живой.

### Альтернатива: Docker (опционально, Волна 2)

Создам `Dockerfile` если нужен, но MVP работает standalone.

---

## Следующие шаги (Волна 2–3)

### Волна 2: Auth + Биллинг (4–5 недель)

- [ ] Auth.js v5 (magic link, Google OAuth)
- [ ] Stripe Checkout + webhook (Pro subscription, разовый Report unlock)
- [ ] Дашборд: история аудитов, статус подписки, upgrade CTA
- [ ] Scheduled re-audits + email alerts (падение скора на X пунктов)
- [ ] PDF-экспорт (puppeteer)
- [ ] Customer Portal (Stripe hosted)
- [ ] RU payments (YooKassa за интерфейсом `PaymentProvider`)

### Волна 3: Масштаб (4–6 недель)

- [ ] Глубокий кроулинг (100+ страниц, граф ссылок)
- [ ] Agency API (OAuth2, rate limits, webhooks)
- [ ] Google Search Console OAuth (вместо эвристик — реальные данные)
- [ ] Ads policy LLM classifier (категорийные запреты, misleading detection)
- [ ] AI-generated fixes (готовые JSON-LD, переписанные title/meta)
- [ ] Симуляция AI Overview (как ИИ процитирует на список запросов)

### Волна 4: Сообщество (3–4 недели)

- [ ] Командные аккаунты, роли
- [ ] hreflang validation
- [ ] Slack/Telegram alerts
- [ ] Partner program (реферальные комиссии)
- [ ] Публичные dashboards (примеры лучших сайтов)

---

## Мониторинг & Поддержка

### Логирование

Добавить при Волне 2:
```bash
npm install pino pino-pretty   # структурированные логи
```

### Аналитика (опционально)

```bash
npm install @plausible/analytics   # или Umami self-hosted
```

---

## FAQ для разработчиков

**Q: Как добавить новую проверку?**

A: В `src/server/audit/checks/[category].ts`:
```typescript
{
  id: "my-check",
  category: "technical",
  weight: 2,
  appliesToScore: ["seo", "ads"],
  tier: "free",  // or "paid"
  run(ctx) {
    const value = ctx.http.ttfbMs;
    return threshold(value, 800, 1800, { ttfbMs: value });
  },
}
```

Добавь в `src/server/audit/checks/index.ts`:
```typescript
export const allChecks: Check[] = [
  // ... existing
  myNewCheck,
];
```

Тест в `tests/checks/[category].test.ts`.

**Q: Как менять веса категорий?**

A: Только в `src/server/audit/weights.ts`, раздел `SEO_CATEGORY_WEIGHTS`. Все старые отчёты используют сохранённый снапшот скора, новые вычисляются по актуальным весам.

**Q: Как работает rate limit?**

A: IP-хеш (sha256) + день (YYYY-MM-DD) → count. Зафиксировано в БД, проверяется на каждый POST /api/audits. Не требует сессий.

**Q: Можно ли запустить без PageSpeed Insights API?**

A: Да. Если `PSI_API_KEY` не задана, PSI-проверки помечаются `na`, веса перенормируются. Тесты и non-PSI проверки работают.

**Q: Что делать с Cloudflare 403 от сайта?**

A: Это автоматически детектируется как `SiteUnreachableError` с reason: "blocked" и репортируется как finding, а не краш. UA честный: `ReadinessAuditBot/1.0`.

---

## Лицензия

MIT (можешь использовать, модифицировать, продавать — как угодно)

---

**Дата создания**: 2026-06-12  
**MVP версия**: 0.1.0  
**Статус**: Ready for beta testing
