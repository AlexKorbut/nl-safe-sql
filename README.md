# GoogleReady — Google Search & Ads Readiness Auditor

Submit a URL → get a 0–100 readiness score for **Google's modern ranking systems** (AI Overviews citability, E-E-A-T, Helpful Content, Core Web Vitals, structured data, indexability) and for **Google Ads landing page quality** (Quality Score factors, policy signals) — in one report, EN + RU.

## How it works

1. **Collect** — all I/O happens once: page fetch + parse (cheerio), robots.txt, sitemap, PageSpeed Insights (mobile + desktop), broken-link sample, one batched LLM call (OpenAI structured outputs).
2. **Check** — ~42 pluggable checks (pure functions over the collected context) across 5 categories: Technical/CWV, Indexability, Structured data, Content/E-E-A-T, Ads landing.
3. **Score** — weighted category subscores → SEO score + Ads score + overall. Weights live in `src/server/audit/weights.ts`.

Audits run in an in-process queue (no Redis) with live progress streamed over SSE; SQLite is the source of truth, so refreshes and restarts recover cleanly.

## Quick start

```bash
cp .env.example .env   # add PSI_API_KEY (free) and optionally OPENAI_API_KEY
npm install
npm run db:migrate     # creates SQLite schema
npm run dev            # http://localhost:3000
```

Run tests: `npm test`

## Stack

Next.js (App Router) · TypeScript · Tailwind · next-intl (EN/RU) · Drizzle + SQLite · Vitest

**Deploy note:** run as a **single process** (SQLite + in-process job queue + SSE). A small VPS behind Caddy is the intended target; `output: "standalone"` is enabled.

## Project structure

```
src/server/audit/
  engine.ts        # collect → check → score orchestration
  types.ts         # AuditContext / Check / CheckResult contracts
  weights.ts       # all score tuning in one place
  collectors/      # fetchPage, parseHtml, robots, sitemap, psi, links, llm
  checks/          # technical, indexability, structured-data, content, ads
src/server/jobs/runner.ts      # in-process queue + SSE events + restart recovery
src/server/report/serialize.ts # server-side free/paid gating
src/app/api/audits/            # POST create, GET report, GET /events (SSE)
src/app/[locale]/              # landing, audit progress, report, pricing
messages/{en,ru}.json          # all UI + check copy
```

## Pricing model (planned)

| Plan | Price | Includes |
|---|---|---|
| Free | $0 | 3 audits/day, scores + top-3 issues |
| Report | $19 / 990₽ | one full report |
| Pro | $29/mo / 1 490₽ | 30 audits/mo, history, monitoring |
| Agency | $99/mo / 4 990₽ | 200 audits/mo, white-label, API |

Unit economics: an audit costs ≈$0.02–0.05 (PSI is free; one gpt-4o-mini call). Gating is already enforced server-side (`ENFORCE_FREE_TIER`), billing is the next milestone.

## Roadmap

- **Wave 2**: Auth.js magic-link login, Stripe Checkout + webhook, scheduled re-audits + score-drop alerts, PDF export, audit history, RU payments (YooKassa behind the `PaymentProvider` seam)
- **Wave 3**: full-site crawl, agency API, Google Search Console integration, ads policy LLM classifier, AI-generated fixes (JSON-LD, titles), AI Overview simulation
- **Wave 4**: teams & roles, hreflang validation, Slack/Telegram alerts, partner program
