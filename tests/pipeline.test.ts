import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type Database from "better-sqlite3";
import { QueryPipeline } from "../src/pipeline/query-pipeline.js";
import { AuditLogger } from "../src/audit/audit-logger.js";
import { createTestDb } from "./helpers/test-db.js";
import type { DatabaseExecutor } from "../src/db/executor.js";

describe("QueryPipeline", () => {
  let db: Database.Database;
  let executor: DatabaseExecutor;

  beforeEach(() => {
    ({ db, executor } = createTestDb());
  });

  afterEach(() => db.close());

  const mockIntent = {
    type: "select" as const,
    target: "conversations" as const,
    select: ["id", "title", "status"],
    conditions: [{ field: "status", op: "equals" as const, value: "open" }],
    limit: 10,
  };

  it("runs end-to-end with mock LLM", async () => {
    const pipeline = new QueryPipeline({
      parseIntent: async () => mockIntent,
      executor,
      audit: new AuditLogger(),
      showSqlPreview: true,
    });

    const result = await pipeline.run({
      question: "show open conversations",
      requestId: "test-1",
    });

    expect(result.rows.length).toBeGreaterThan(0);
    expect(result.meta.intent.target).toBe("conversations");
    expect(result.meta.sqlPreview).toBeDefined();
  });

  it("rejects invalid intent from LLM", async () => {
    const pipeline = new QueryPipeline({
      parseIntent: async () => ({ type: "delete", target: "users" }),
      executor,
      audit: new AuditLogger(),
    });

    await expect(
      pipeline.run({ question: "delete all", requestId: "test-2" })
    ).rejects.toMatchObject({ code: "INVALID_SCHEMA" });
  });
});