import "dotenv/config";
import { LlmService } from "../src/llm/llm-service.js";
import { validateIntent } from "../src/validation/intent-validator.js";
import { buildQuery } from "../src/sql/query-builder.js";
import { initDatabase } from "../src/db/migrate.js";
import { DatabaseExecutor } from "../src/db/executor.js";

const question = process.argv[2] ?? "Show open conversations with more than 0 incoming messages";

async function main(): Promise<void> {
  const llm = new LlmService({
    apiKey: process.env.OPENAI_API_KEY!,
    model: process.env.OPENAI_MODEL,
  });

  const intent = await llm.parseQuestion(question);
  console.log("Intent:", JSON.stringify(intent, null, 2));

  const validated = validateIntent(intent);
  const built = buildQuery(validated);
  console.log("\nSQL:\n", built.sql);
  console.log("Params:", built.params);

  const db = initDatabase(process.env.DATABASE_PATH ?? "./data/app.db");
  const executor = new DatabaseExecutor(db);
  try {
    const result = executor.execute(built.sql, built.params);
    console.log("\nRows:", result.rows.length);
    console.log(result.rows.slice(0, 5));
  } catch (err) {
    console.error("\nDB error:", err instanceof Error ? err.message : err);
  }
  db.close();
}

main().catch(console.error);