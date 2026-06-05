import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type Database from "better-sqlite3";
import { validateIntent } from "../src/validation/intent-validator.js";
import { buildQuery } from "../src/sql/query-builder.js";
import { createTestDb } from "./helpers/test-db.js";
import type { DatabaseExecutor } from "../src/db/executor.js";

describe("QueryBuilder", () => {
  let db: Database.Database;
  let executor: DatabaseExecutor;

  beforeEach(() => {
    ({ db, executor } = createTestDb());
  });

  afterEach(() => db.close());

  it("builds parameterized query for open conversations", () => {
    const validated = validateIntent({
      type: "select",
      target: "conversations",
      select: ["id", "title", "status"],
      conditions: [{ field: "status", op: "equals", value: "open" }],
      orderBy: [{ field: "created_at", direction: "desc" }],
      limit: 5,
    });

    const built = buildQuery(validated);
    expect(built.sql).toContain("WHERE");
    expect(built.sql).toContain("LIMIT ?");
    expect(built.params).toEqual(["open", 5]);
    expect(built.sql).not.toContain("open");

    const result = executor.execute(built.sql, built.params);
    expect(result.rows.length).toBeGreaterThan(0);
    expect(result.rows.every((r) => r.status === "open")).toBe(true);
  });

  it("joins tags for billing filter", () => {
    const validated = validateIntent({
      type: "select",
      target: "conversations",
      select: ["id", "title"],
      conditions: [{ field: "tags.name", op: "equals", value: "billing" }],
      requiredTables: ["tags"],
    });

    const built = buildQuery(validated);
    expect(built.sql).toContain("conversation_tags");
    expect(built.sql).toContain("tags.name = ?");

    const result = executor.execute(built.sql, built.params);
    expect(result.rows.length).toBeGreaterThanOrEqual(1);
    expect(result.rows.some((r) => String(r.title).toLowerCase().includes("billing"))).toBe(true);
  });

  it("resolves relative dates in conditions", () => {
    const validated = validateIntent({
      type: "select",
      target: "conversations",
      select: ["id"],
      conditions: [{ field: "created_at", op: "gte", value: "-30 days" }],
      limit: 10,
    });

    const built = buildQuery(validated);
    expect(built.params[0]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("uses contains with LIKE placeholder", () => {
    const validated = validateIntent({
      type: "select",
      target: "messages",
      select: ["id", "content"],
      conditions: [{ field: "content", op: "contains", value: "refund" }],
      limit: 10,
    });

    const built = buildQuery(validated);
    expect(built.sql).toContain("LIKE ?");
    expect(built.params[0]).toBe("%refund%");

    const result = executor.execute(built.sql, built.params);
    expect(result.rows.length).toBeGreaterThanOrEqual(1);
  });
});