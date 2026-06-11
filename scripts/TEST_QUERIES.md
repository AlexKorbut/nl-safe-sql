# Test queries (natural language)

After `npm run db:reseed`, the database contains:
- **20** conversations (hotel guest inbox)
- **45** messages (incoming/outgoing)
- **15** tag assignments (complaint, room_order, support, …)

Start the API: `npm run dev` → `POST http://localhost:3000/query`

## Feedback queries (all supported)

| Question | Capability exercised |
|----------|---------------------|
| Show conversations from the email channel | `channel` filter |
| Show open conversations from the last 7 days that came from WhatsApp | channel + status + date |
| Show conversations that have both the complaint tag and a message mentioning breakfast | EXISTS (no duplicates) |
| Show open conversations with their incoming message count, highest first | aggregate + GROUP BY + ORDER BY |
| Count conversations by status | aggregate + GROUP BY |
| How many messages did we send vs receive this month | GROUP BY direction + date |
| Count conversations by channel for the last 30 days | GROUP BY channel + date |
| How many complaint conversations do we have | scalar COUNT + EXISTS |
| Which guests have the most conversations | GROUP BY guest_name |
| Which guests have the most complaints | GROUP BY + EXISTS tag |
| For each guest, how many incoming messages have we received | join-filtered COUNT |
| Show unanswered conversations from the last 7 days | not_exists outgoing |
| Find complaint conversations where the guest mentioned breakfast | dual EXISTS |
| Need untagged conversations from tomorrow | not_exists tags + date |
| Conversations not tagged as room_order | not_exists tag label |
| Show conversations from email or WhatsApp | OR conditions |
| Find messages starting with Hi | starts_with |
| Find messages ending with thanks | ends_with |
| Show open conversations with more than 0 incoming messages | HAVING |

## curl (PowerShell)

```powershell
$body = @{ question = "Show unanswered conversations from the last 7 days" } | ConvertTo-Json
Invoke-RestMethod -Uri http://localhost:3000/query -Method POST -Body $body -ContentType "application/json"
```

## Verification without LLM

```bash
npm run db:reseed
npm run db:verify
npm test
```

`db:verify` runs canned intents through the Query Builder. `npm test` includes all feedback scenarios as fixed JSON intents.