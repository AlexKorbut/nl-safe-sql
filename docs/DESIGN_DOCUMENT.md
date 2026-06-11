# NL → Safe SQL Execution Pipeline
## Design Document & Cover Letter

**Author:** Alexander Korbut  
**Repository:** [github.com/AlexKorbut/nl-safe-sql](https://github.com/AlexKorbut/nl-safe-sql)  
**Date:** June 2026

---

## 1. Problem Statement

Hotel operations staff need a **natural-language query interface** over guest conversations without writing SQL. The naive approach — asking an LLM to emit SQL — creates severe risks:

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
| Completeness | Support aggregates, EXISTS, OR, HAVING per test-challenge queries |
| TypeScript | Full implementation in TypeScript |

### Non-goals

- Nested boolean condition groups (flat AND/OR only)
- LLM-generated SQL under any circumstances
- Arbitrary subqueries beyond whitelisted EXISTS patterns

---

## 2. Solution Options Considered

### Option A — LLM generates SQL + post-execution sandbox

**Rejected** — fails the fundamental security model.

### Option B — LLM generates Query Intent JSON + deterministic builder (chosen)

```
Natural Language → LLM → Query Intent JSON → Validator → Query Builder → SQLite
```

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
                    │  QueryBuilder — SELECT / EXISTS / GROUP BY / HAVING / LIMIT   │
                    │  ConditionBuilder + ExistsBuilder + AggregateBuilder        │
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
2. **Zod schema** — `type: select | aggregate` only; known targets and operators
3. **Schema registry whitelist** — allowed tables, fields, ops per field type
4. **Deterministic builder** — no string concatenation of user values; only `?` placeholders
5. **Fail-closed errors** — validation → HTTP 400; LLM failure → HTTP 502

### Data model (per test challenge)

| Entity | Key fields | Purpose |
|--------|------------|---------|
| `conversations` | `guest_name`, `channel`, `status`, `created_at` | Guest thread; `channel` is `email` or `whatsapp` |
| `messages` | `conversation_id`, `direction`, `body`, `sent_at` | `direction` is `incoming` or `outgoing` |
| `tags` | `conversation_id`, `label` | Tag assignments (complaint, room_order, …) |

Seed: 20 conversations, 45 messages, 15 tag rows.

### Key design decisions

| Decision | Rationale |
|----------|-----------|
| EXISTS for multi-table filters | INNER JOIN on messages + tags causes cross-product duplicates |
| JOIN only for SELECT/GROUP BY | Filters on related tables never add JOIN rows |
| `relatedFilters` with empty conditions | `not_exists` on tags with no conditions = untagged conversations |
| Unanswered = no outgoing message | Simple, testable definition documented explicitly |
| Flat OR via `conditionLogic` | Covers email OR whatsapp without nested expression trees |

---

## 4. Query Intent schema (extended)

```json
{
  "type": "select | aggregate",
  "target": "conversations | messages",
  "select": ["field"] | [{ "fn": "count", "field": "*", "alias": "count", "filter": [...] }],
  "conditions": [{ "field", "op", "value" }],
  "conditionLogic": "and | or",
  "relatedFilters": [{ "relation": "messages|tags", "existence": "exists|not_exists", "conditions": [] }],
  "groupBy": ["field"],
  "having": [{ "fn": "count", "field": "messages.id", "alias": "...", "op": "gt", "value": 0, "filter": [...] }],
  "orderBy": [{ "field", "direction" }],
  "limit": 100
}
```

Operators: `equals`, `notEquals`, `gte`, `lte`, `contains`, `starts_with`, `ends_with`

---

## 5. How the Approach Was Validated

| Layer | Validation |
|-------|------------|
| Date resolver | Unit tests for `-7 days`, `tomorrow`, `+N days`, `this month` |
| Intent validator | Unit tests for forbidden tables, fields, operators, aggregates |
| Query builder | Unit tests for EXISTS, OR, GROUP BY, HAVING |
| Feedback scenarios | 18 integration tests — one per reviewer query category |
| Data layer | `npm run db:verify` — 8 canned intents against seed data |
| Pipeline | Integration test with mock LLM (no API key required) |

---

## 6. Expected query behavior

Seed reference date in docs: **2026-06-03**. Relative expressions resolve against server clock at runtime.

| Query | Mechanism | Expected |
|-------|-----------|----------|
| Email channel | `channel = email` | Multiple rows, all email |
| Open + WhatsApp + last 7 days | AND conditions | Subset of open whatsapp |
| Complaint + breakfast | dual EXISTS | ids 2, 8 — no duplicate rows |
| Incoming count ranking | COUNT + filter + GROUP BY | Open conversations ordered by count |
| Count by status | GROUP BY status | 2 groups summing to 20 |
| Send vs receive this month | GROUP BY direction | incoming + outgoing counts |
| Unanswered | not_exists outgoing | ids 12, 16, 18 among others |
| Untagged tomorrow | not_exists tags + date | ids 16, 17, 18 on 2026-06-04 |
| Not tagged room_order | not_exists label=room_order | 19 rows |
| Email OR WhatsApp | conditionLogic or | All 20 conversations |
| Starts with Hi / ends with thanks | LIKE patterns | Matching message bodies |
| > 0 incoming messages | HAVING count > 0 | Open conversations with replies received |

---

## 7. Conclusion

This project demonstrates a **safe NL-to-data pipeline** aligned with the hotel test-challenge specification. The LLM is confined to structured intent JSON; all executable SQL is produced deterministically with whitelists, EXISTS-based correlation, and prepared statements.

---

*Alexander Korbut — [GitHub](https://github.com/AlexKorbut)*