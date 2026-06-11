# NL → Safe SQL Pipeline

Production-oriented natural language interface where **the LLM never generates SQL** — only structured Query Intent JSON. All SQL is built deterministically with whitelists and prepared statements.

## Architecture

1. **NL Interface** — OpenAI returns Query Intent JSON
2. **Intent Validator** — schema + whitelist (tables, fields, ops)
3. **Deterministic Execution** — Query Builder → SQLite (parameterized)
4. **Response Formatter** — rows + metadata (+ optional SQL preview)

## Design document

Problem statement, solution options, architecture decisions, and expected query behavior:

- [docs/DESIGN_DOCUMENT.md](docs/DESIGN_DOCUMENT.md)
- [docs/DESIGN_DOCUMENT.pdf](docs/DESIGN_DOCUMENT.pdf)

## Quick start

```bash
cd nl-safe-sql
cp .env.example .env
# Set OPENAI_API_KEY in .env

npm install
npm run db:reseed   # hotel mock data (20 conversations, 45 messages, 15 tags)
npm run db:verify   # verify builder against canned intents (no LLM)
npm run dev
```

```bash
curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -d "{\"question\": \"Show unanswered conversations from the last 7 days\"}"
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start API server |
| `npm test` | Run unit & integration tests |
| `npm run build` | Compile TypeScript |
| `npm run db:reseed` | Reset schema and reload seed data |
| `npm run db:verify` | Run canned intents against SQLite |

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | — | Required for `/query` |
| `OPENAI_MODEL` | `gpt-4o-mini` | OpenAI model |
| `DATABASE_PATH` | `./data/app.db` | SQLite file path |
| `PORT` | `3000` | HTTP port |
| `SHOW_SQL_PREVIEW` | `false` | Include built SQL in response |

## Data model (hotel inbox)

| Table | Fields |
|-------|--------|
| `conversations` | `guest_name`, `channel` (email/whatsapp), `status`, `created_at` |
| `messages` | `direction` (incoming/outgoing), `body`, `sent_at` |
| `tags` | `conversation_id`, `label` (complaint, room_order, …) |

## Supported query capabilities

- Filters: AND / OR conditions, relative dates (`-7 days`, `tomorrow`, `this month`)
- Operators: `equals`, `contains`, `starts_with`, `ends_with`, comparisons
- Related filters: `exists` / `not_exists` (unanswered, untagged, not tagged as X)
- Aggregates: `COUNT`, `GROUP BY`, `HAVING`, join-filtered metrics
- Multi-table filters via `EXISTS` (no cross-product duplicates)

## Example questions

- Show conversations from the email channel
- Show open conversations from the last 7 days that came from WhatsApp
- Find conversations tagged complaint where the guest mentioned breakfast
- Show unanswered conversations from the last 7 days
- Count conversations by status
- How many messages did we send vs receive this month
- Find messages starting with Hi

Full list: [scripts/TEST_QUERIES.md](scripts/TEST_QUERIES.md)

## Security

- LLM outputs JSON only (no SQL in prompt output)
- Strict field/table/operator whitelist
- Parameterized queries (`?` placeholders)
- Invalid intents fail closed with HTTP 400