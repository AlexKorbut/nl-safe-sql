# Test queries (natural language)

After `npm run db:reseed`, the database contains:
- **15** conversations (9 open, 6 closed)
- **28** messages
- **10** tags: billing, refund, feedback, support, security, api, enterprise, bug, mobile, onboarding

Start the API: `npm run dev` → `POST http://localhost:3000/query`

## Example questions (copy into the `"question"` body field)

| Question | Expected result |
|----------|-----------------|
| Show open conversations | ~9 rows, status = open |
| Find messages containing refund | 2+ messages about refund |
| Conversations tagged billing | Conversations #1, #2, #5, #6 |
| Show conversations from the last 7 days | created_at >= 2026-05-27 |
| List closed conversations | 6 closed |
| Messages about API rate limits | Conversation #7 |
| Conversations tagged security | #8, #11 |
| Find messages containing billing | Several messages |
| Show conversations tagged bug | #12, #13 |
| Open conversations about mobile | #13 (mobile + open) |

## curl (PowerShell)

```powershell
$body = @{ question = "Show open conversations" } | ConvertTo-Json
Invoke-RestMethod -Uri http://localhost:3000/query -Method POST -Body $body -ContentType "application/json"
```

## Verification without LLM

```bash
npm run db:reseed
npm run db:verify
```

`db:verify` runs 4 predefined intents through the Query Builder — if all pass, the data and SQL layer are working.
