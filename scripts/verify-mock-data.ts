/**
 * Runs sample queries against mock data (no LLM). Confirms DB + builder work.
 */
import "dotenv/config";
import { initDatabase } from "../src/db/migrate.js";
import { DatabaseExecutor } from "../src/db/executor.js";
import { validateIntent } from "../src/validation/intent-validator.js";
import { buildQuery } from "../src/sql/query-builder.js";

const DATABASE_PATH = process.env.DATABASE_PATH ?? "./data/app.db";

const samples = [
  {
    name: "Open conversations",
    intent: {
      type: "select" as const,
      target: "conversations" as const,
      select: ["id", "title", "status"],
      conditions: [{ field: "status", op: "equals" as const, value: "open" }],
      limit: 20,
    },
  },
  {
    name: "Messages containing refund",
    intent: {
      type: "select" as const,
      target: "messages" as const,
      select: ["id", "content"],
      conditions: [{ field: "content", op: "contains" as const, value: "refund" }],
      limit: 10,
    },
  },
  {
    name: "Conversations tagged billing",
    intent: {
      type: "select" as const,
      target: "conversations" as const,
      select: ["id", "title"],
      conditions: [{ field: "tags.name", op: "equals" as const, value: "billing" }],
      requiredTables: ["tags" as const],
      limit: 10,
    },
  },
  {
    name: "Recent conversations (last 7 days)",
    intent: {
      type: "select" as const,
      target: "conversations" as const,
      select: ["id", "title", "created_at"],
      conditions: [
        { field: "created_at", op: "gte" as const, value: "-7 days" },
      ],
      orderBy: [{ field: "created_at", direction: "desc" as const }],
      limit: 10,
    },
  },
];

function main(): void {
  const db = initDatabase(DATABASE_PATH);
  const executor = new DatabaseExecutor(db);

  console.log(`Verifying mock data at ${DATABASE_PATH}\n`);

  let ok = 0;
  for (const sample of samples) {
    const validated = validateIntent(sample.intent);
    const built = buildQuery(validated);
    const result = executor.execute(built.sql, built.params);
    const pass = result.rows.length > 0;
    if (pass) ok++;
    console.log(
      `${pass ? "OK" : "WARN"}  ${sample.name}: ${result.rows.length} row(s)`
    );
    if (!pass) console.log(`       SQL: ${built.sql}`);
  }

  db.close();
  console.log(`\n${ok}/${samples.length} samples returned data.`);
  if (ok < samples.length) {
    console.log("Run: npm run db:reseed");
    process.exit(1);
  }
}

main();