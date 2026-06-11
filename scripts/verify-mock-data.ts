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
      select: ["id", "guest_name", "status"],
      conditions: [{ field: "status", op: "equals" as const, value: "open" }],
      limit: 20,
    },
    minRows: 1,
  },
  {
    name: "Email channel",
    intent: {
      type: "select" as const,
      target: "conversations" as const,
      select: ["id", "guest_name", "channel"],
      conditions: [{ field: "channel", op: "equals" as const, value: "email" }],
      limit: 20,
    },
    minRows: 1,
  },
  {
    name: "Complaint + breakfast (EXISTS)",
    intent: {
      type: "select" as const,
      target: "conversations" as const,
      select: ["id", "guest_name"],
      relatedFilters: [
        {
          relation: "tags" as const,
          existence: "exists" as const,
          conditions: [{ field: "label", op: "equals" as const, value: "complaint" }],
        },
        {
          relation: "messages" as const,
          existence: "exists" as const,
          conditions: [{ field: "body", op: "contains" as const, value: "breakfast" }],
        },
      ],
      limit: 20,
    },
    minRows: 1,
  },
  {
    name: "Count by status",
    intent: {
      type: "aggregate" as const,
      target: "conversations" as const,
      select: [{ fn: "count" as const, field: "*", alias: "count" }, "status"],
      groupBy: ["status"],
      limit: 10,
    },
    minRows: 2,
  },
  {
    name: "Unanswered conversations",
    intent: {
      type: "select" as const,
      target: "conversations" as const,
      select: ["id", "guest_name"],
      relatedFilters: [
        {
          relation: "messages" as const,
          existence: "not_exists" as const,
          conditions: [{ field: "direction", op: "equals" as const, value: "outgoing" }],
        },
      ],
      limit: 20,
    },
    minRows: 1,
  },
  {
    name: "Email OR WhatsApp",
    intent: {
      type: "select" as const,
      target: "conversations" as const,
      select: ["id", "channel"],
      conditions: [
        { field: "channel", op: "equals" as const, value: "email" },
        { field: "channel", op: "equals" as const, value: "whatsapp" },
      ],
      conditionLogic: "or" as const,
      limit: 50,
    },
    minRows: 1,
  },
  {
    name: "Messages starting with Hi",
    intent: {
      type: "select" as const,
      target: "messages" as const,
      select: ["id", "body"],
      conditions: [{ field: "body", op: "starts_with" as const, value: "Hi" }],
      limit: 10,
    },
    minRows: 1,
  },
  {
    name: "Incoming count per open conversation",
    intent: {
      type: "aggregate" as const,
      target: "conversations" as const,
      select: [
        "id",
        "guest_name",
        {
          fn: "count" as const,
          field: "messages.id",
          alias: "incoming_count",
          filter: [{ field: "direction", op: "equals" as const, value: "incoming" }],
        },
      ],
      conditions: [{ field: "status", op: "equals" as const, value: "open" }],
      requiredTables: ["messages" as const],
      groupBy: ["id", "guest_name"],
      orderBy: [{ field: "incoming_count", direction: "desc" as const }],
      limit: 10,
    },
    minRows: 1,
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
    const pass = result.rows.length >= sample.minRows;
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