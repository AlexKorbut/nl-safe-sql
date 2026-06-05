# NL → Safe SQL Pipeline

Production-oriented natural language interface where **the LLM never generates SQL** — only structured Query Intent JSON. All SQL is built deterministically with whitelists and prepared statements.

## Architecture

1. **NL Interface** — OpenAI returns Query Intent JSON
2. **Intent Validator** — schema + whitelist (tables, fields, ops)
3. **Deterministic Execution** — Query Builder → SQLite (parameterized)
4. **Response Formatter** — rows + metadata (+ optional SQL preview)

## Quick start

```bash
cd nl-safe-sql
cp .env.example .env
# Set OPENAI_API_KEY in .env

npm install
npm run db:reseed   # загрузить mock-данные (15 диалогов, 28 сообщений, 10 тегов)
npm run db:verify   # проверить данные без LLM
npm run dev
```

```bash
curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -d "{\"question\": \"Show open conversations from the last 7 days\"}"
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start API server |
| `npm test` | Run unit & integration tests |
| `npm run build` | Compile TypeScript |

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | — | Required for `/query` |
| `OPENAI_MODEL` | `gpt-4o-mini` | OpenAI model |
| `DATABASE_PATH` | `./data/app.db` | SQLite file path |
| `PORT` | `3000` | HTTP port |
| `SHOW_SQL_PREVIEW` | `false` | Include built SQL in response |

## Mock data

```bash
npm run db:reseed   # пересоздать тестовые данные
npm run db:verify     # 4 проверочных запроса без OpenAI
```

Подробные примеры вопросов: [scripts/TEST_QUERIES.md](scripts/TEST_QUERIES.md)

## Example questions

- Show open conversations from the last 7 days
- Find messages containing refund
- Conversations tagged billing
- List closed conversations
- Conversations tagged security
- Messages about API rate limits

## Security

- LLM outputs JSON only (no SQL in prompt output)
- Strict field/table/operator whitelist
- Parameterized queries (`?` placeholders)
- Invalid intents fail closed with HTTP 400