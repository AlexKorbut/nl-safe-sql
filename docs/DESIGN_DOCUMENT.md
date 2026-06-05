# NL → Safe SQL Execution Pipeline
## Design Document & Cover Letter

**Author:** Alexander Korbut  
**Repository:** [github.com/AlexKorbut/nl-safe-sql](https://github.com/AlexKorbut/nl-safe-sql)  
**Date:** June 2026

---

## 1. Problem Statement

Operational SaaS products often need a **natural-language query interface** so staff can explore inbox-style data without writing SQL. The naive approach — asking an LLM to emit SQL and executing it — creates severe risks:

- **SQL injection** via prompt manipulation or model hallucination
- **Unbounded data access** (DROP, DELETE, arbitrary table scans)
- **Non-deterministic queries** that are hard to audit, test, or reproduce
- **Schema drift** when the model invents columns or tables

The required pipeline: users ask questions in plain language, but **the LLM never produces executable SQL**. It emits a constrained **Query Intent JSON** that a **deterministic transpiler** turns into parameterized SQL against SQLite.

### Goals

| Goal | Description |
|------|-------------|
| Safety by design | SQL injection structurally impossible; invalid intents fail closed |
| Determinism | Same intent JSON always produces the same SQL |
| Testability | Builder, validator, and pipeline testable without the LLM |
| Operability | HTTP API, seed data, audit trail, debug visibility |
| TypeScript | Full implementation in TypeScript |

---

## 2. Solution Options Considered

All candidates assume an **LLM in the NL understanding step**. The decision was *how* the model participates — not whether to use one.

### Option A — LLM generates SQL + post-execution sandbox

The model outputs SQL; a parser or allow-list strips dangerous statements before execution.

| Pros | Cons |
|------|------|
| Maximum expressiveness (JOINs, aggregates) | Parsing SQL reliably is hard; bypasses are common |
| Minimal intermediate schema | Non-deterministic; hard to unit-test |
| | Violates the core constraint: LLM must not produce SQL |

**Rejected** — fails the fundamental security model.

---

### Option B — LLM generates Query Intent JSON + deterministic builder (chosen)

```
Natural Language → LLM → Query Intent JSON → Validator → Query Builder → SQLite
```

| Pros | Cons |
|------|------|
| LLM never touches SQL | Intent schema must be designed upfront |
| Whitelist validation before build | Aggregations require schema extension |
| Parameterized queries (`?`) | Complex questions may not map cleanly |
| Fully unit-testable transpiler | |

**Selected** — separates probabilistic NL understanding from deterministic execution.

---

## 3. Chosen Architecture

```
┌─────────────┐    ┌──────────────┐    ┌─────────────────┐    ┌──────────────┐
│  Web UI /   │───▶│  POST /query │───▶│   LlmService    │───▶│  raw Intent  │
│  curl       │    │  (Fastify)   │    │  (OpenAI JSON)  │    │  (unknown)   │
└─────────────┘    └──────────────┘    └─────────────────┘    └──────┬───────┘
                                                                       │
                    ┌──────────────────────────────────────────────────▼──────────┐
                    │  IntentValidator — Zod schema + table/field/op whitelist    │
                    └──────────────────────────────────────────────────┬──────────┘
                                                                       │
                    ┌──────────────────────────────────────────────────▼──────────┐
                    │  QueryBuilder — SELECT / JOIN / WHERE / ORDER BY / LIMIT      │
                    │  ConditionBuilder + DateResolver + JoinManager                │
                    └──────────────────────────────────────────────────┬──────────┘
                                                                       │
                    ┌──────────────────────────────────────────────────▼──────────┐
                    │  DatabaseExecutor — better-sqlite3 prepared statements        │
                    └──────────────────────────────────────────────────┬──────────┘
                                                                       │
                    ┌──────────────────────────────────────────────────▼──────────┐
                    │  ResponseFormatter — rows + meta (intent, SQL preview)        │
                    └─────────────────────────────────────────────────────────────┘
```

### Security layers

1. **Prompt contract** — system prompt forbids SQL output; `response_format: json_object`
2. **Zod schema** — `type: "select"` only; known targets and operators
3. **Schema registry whitelist** — allowed tables, fields, ops per field type
4. **Deterministic builder** — no string concatenation of user values; only `?` placeholders
5. **Fail-closed errors** — validation → HTTP 400; LLM failure → HTTP 502

### Data model

Generic inbox schema used to exercise the pipeline (15 conversations, 28 messages, 10 tags in seed data):

| Entity | Key fields | Purpose |
|--------|------------|---------|
| `conversations` | `id`, `title`, `status`, `created_at` | Thread metadata; `status` is `open` or `closed` |
| `messages` | `id`, `conversation_id`, `role`, `content`, `created_at` | `role` is `user` or `assistant` |
| `tags` | `id`, `name` | Label catalog |
| `conversation_tags` | `conversation_id`, `tag_id` | Many-to-many link |

The transpiler is domain-agnostic: only the schema registry and seed data are swappable.

---

## 4. How the Approach Was Validated

| Layer | Validation |
|-------|------------|
| Date resolver | Unit tests for `-7 days`, `today`, `this month`, ISO dates |
| Intent validator | Unit tests for forbidden tables, fields, operators, limits |
| Query builder | Unit tests for JOIN inference, WHERE, ORDER BY, LIMIT |
| Pipeline | Integration test with mock LLM (no API key required) |
| Data layer | `npm run db:verify` — 4 canned intents against seed data |
| Manual E2E | Web UI + `scripts/TEST_QUERIES.md` query catalog |

---

## 5. Expected Query Behavior

Seed reference date: **2026-06-03**. Relative expressions (`-7 days`, `today`) resolve against the server clock at runtime.

### 5.1 Conversation filters

| Query | Expected result |
|-------|-----------------|
| `Show open conversations` | **9 rows** — all `status = open` |
| `List closed conversations` | **6 rows** — all `status = closed` |
| `Show conversation id 7` | **1 row** — "API rate limit question" |
| `Conversations with title containing billing` | **1 row** — id 1 |
| `Show all conversations ordered by created_at descending` | **15 rows** — newest first (id 13 on top) |

### 5.2 Message search

| Query | Expected result |
|-------|-----------------|
| `Find messages containing refund` | **3 rows** — conv 2 (×2) and conv 6 |
| `Messages from user role only` | **15 rows** — all `role = user` |
| `Messages from assistant` | **13 rows** — all `role = assistant` |
| `Messages in conversation 7` | **2 rows** — API rate limit thread |
| `Find messages containing password` | **2 rows** — conv 8 and 11 |

### 5.3 Tag filters

| Query | Expected result |
|-------|-----------------|
| `Conversations tagged billing` | **4 rows** — ids 1, 2, 5, 6 |
| `Conversations tagged security` | **2 rows** — ids 8, 11 |
| `Conversations tagged bug` | **2 rows** — ids 12, 13 |
| `Conversations tagged refund` | **2 rows** — ids 2, 5 |
| `Conversations tagged mobile` | **1 row** — id 13 |

### 5.4 Date filters

| Query | Expected result |
|-------|-----------------|
| `Show conversations from the last 7 days` | **5 rows** — ids 1, 5, 8, 12, 13 (created ≥ 2026-05-27) |
| `Conversations created after 2026-05-25` | **5 rows** — ids 1, 5, 8, 12, 13 |
| `Closed conversations created before 2026-06-01` | **6 rows** — all closed records in seed |
| `Conversations created before 2026-03-01` | **2 rows** — ids 14, 15 |
| `Messages from the last 30 days` | **26 rows** — all except conv 14–15 messages |

### 5.5 Combined filters

| Query | Expected result |
|-------|-----------------|
| `Open conversations tagged billing` | **2 rows** — ids 1, 5 (id 6 is closed) |
| `Open conversations tagged bug` | **2 rows** — ids 12, 13 |
| `Closed conversations tagged refund` | **1 row** — id 2 |
| `Messages about API rate limits` | **2 rows** — conversation 7 |
| `Open conversations from the last 7 days` | **3 rows** — ids 5, 8, 13 (open + recent) |

---

## 6. Conclusion

This project demonstrates a **safe NL-to-data pipeline**: the LLM is confined to a structured intent layer, and all executable SQL is produced deterministically with whitelists and prepared statements.

The seed dataset and example queries above validate the core patterns — status filters, text search, tag joins, relative dates, and multi-condition queries — without coupling the architecture to any single business domain.

---

*Alexander Korbut — [GitHub](https://github.com/AlexKorbut)*
