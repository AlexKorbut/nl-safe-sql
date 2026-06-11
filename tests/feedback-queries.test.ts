import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type Database from "better-sqlite3";
import { validateIntent } from "../src/validation/intent-validator.js";
import { buildQuery } from "../src/sql/query-builder.js";
import { createTestDb } from "./helpers/test-db.js";
import type { DatabaseExecutor } from "../src/db/executor.js";

describe("Feedback query scenarios", () => {
  let db: Database.Database;
  let executor: DatabaseExecutor;

  beforeEach(() => {
    ({ db, executor } = createTestDb());
  });

  afterEach(() => db.close());

  function runIntent(intent: unknown) {
    const validated = validateIntent(intent);
    const built = buildQuery(validated);
    return { built, result: executor.execute(built.sql, built.params) };
  }

  it("filters conversations by email channel", () => {
    const { result } = runIntent({
      type: "select",
      target: "conversations",
      select: ["id", "guest_name", "channel"],
      conditions: [{ field: "channel", op: "equals", value: "email" }],
      limit: 50,
    });
    expect(result.rows.length).toBeGreaterThan(0);
    expect(result.rows.every((r) => r.channel === "email")).toBe(true);
  });

  it("filters open whatsapp conversations from last 7 days", () => {
    const { result } = runIntent({
      type: "select",
      target: "conversations",
      select: ["id", "guest_name", "channel", "status"],
      conditions: [
        { field: "status", op: "equals", value: "open" },
        { field: "channel", op: "equals", value: "whatsapp" },
        { field: "created_at", op: "gte", value: "-7 days" },
      ],
      limit: 50,
    });
    expect(result.rows.every((r) => r.channel === "whatsapp" && r.status === "open")).toBe(true);
  });

  it("finds complaint conversations mentioning breakfast without duplicates", () => {
    const { result } = runIntent({
      type: "select",
      target: "conversations",
      select: ["id", "guest_name"],
      relatedFilters: [
        {
          relation: "tags",
          existence: "exists",
          conditions: [{ field: "label", op: "equals", value: "complaint" }],
        },
        {
          relation: "messages",
          existence: "exists",
          conditions: [{ field: "body", op: "contains", value: "breakfast" }],
        },
      ],
      limit: 50,
    });
    const ids = result.rows.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain(2);
    expect(ids).toContain(8);
  });

  it("ranks open conversations by incoming message count", () => {
    const { result } = runIntent({
      type: "aggregate",
      target: "conversations",
      select: [
        "id",
        "guest_name",
        {
          fn: "count",
          field: "messages.id",
          alias: "incoming_count",
          filter: [{ field: "direction", op: "equals", value: "incoming" }],
        },
      ],
      conditions: [{ field: "status", op: "equals", value: "open" }],
      requiredTables: ["messages"],
      groupBy: ["id", "guest_name"],
      orderBy: [{ field: "incoming_count", direction: "desc" }],
      limit: 10,
    });
    expect(result.rows.length).toBeGreaterThan(1);
    const counts = result.rows.map((r) => Number(r.incoming_count));
    expect(counts[0]).toBeGreaterThanOrEqual(counts[1] ?? 0);
  });

  it("counts conversations by status", () => {
    const { result } = runIntent({
      type: "aggregate",
      target: "conversations",
      select: [{ fn: "count", field: "*", alias: "count" }, "status"],
      groupBy: ["status"],
      limit: 10,
    });
    expect(result.rows.length).toBe(2);
    const total = result.rows.reduce((sum, r) => sum + Number(r.count), 0);
    expect(total).toBe(20);
  });

  it("counts messages sent vs received this month", () => {
    const { result } = runIntent({
      type: "aggregate",
      target: "messages",
      select: [{ fn: "count", field: "*", alias: "count" }, "direction"],
      conditions: [{ field: "sent_at", op: "gte", value: "this month" }],
      groupBy: ["direction"],
      limit: 10,
    });
    expect(result.rows.some((r) => r.direction === "incoming")).toBe(true);
    expect(result.rows.some((r) => r.direction === "outgoing")).toBe(true);
  });

  it("counts conversations by channel for last 30 days", () => {
    const { result } = runIntent({
      type: "aggregate",
      target: "conversations",
      select: [{ fn: "count", field: "*", alias: "count" }, "channel"],
      conditions: [{ field: "created_at", op: "gte", value: "-30 days" }],
      groupBy: ["channel"],
      limit: 10,
    });
    expect(result.rows.length).toBe(2);
  });

  it("counts complaint conversations", () => {
    const { result } = runIntent({
      type: "aggregate",
      target: "conversations",
      select: [{ fn: "count", field: "*", alias: "count" }],
      relatedFilters: [
        {
          relation: "tags",
          existence: "exists",
          conditions: [{ field: "label", op: "equals", value: "complaint" }],
        },
      ],
      limit: 1,
    });
    expect(Number(result.rows[0].count)).toBe(4);
  });

  it("finds guests with the most conversations", () => {
    const { result } = runIntent({
      type: "aggregate",
      target: "conversations",
      select: [{ fn: "count", field: "*", alias: "count" }, "guest_name"],
      groupBy: ["guest_name"],
      orderBy: [{ field: "count", direction: "desc" }],
      limit: 5,
    });
    expect(result.rows[0].guest_name).toBe("Anna Müller");
    expect(Number(result.rows[0].count)).toBe(3);
  });

  it("finds guests with the most complaints", () => {
    const { result } = runIntent({
      type: "aggregate",
      target: "conversations",
      select: [{ fn: "count", field: "*", alias: "count" }, "guest_name"],
      relatedFilters: [
        {
          relation: "tags",
          existence: "exists",
          conditions: [{ field: "label", op: "equals", value: "complaint" }],
        },
      ],
      groupBy: ["guest_name"],
      orderBy: [{ field: "count", direction: "desc" }],
      limit: 5,
    });
    expect(result.rows.length).toBeGreaterThan(0);
  });

  it("counts incoming messages per guest", () => {
    const { result } = runIntent({
      type: "aggregate",
      target: "conversations",
      select: [
        "guest_name",
        {
          fn: "count",
          field: "messages.id",
          alias: "incoming_count",
          filter: [{ field: "direction", op: "equals", value: "incoming" }],
        },
      ],
      requiredTables: ["messages"],
      groupBy: ["guest_name"],
      orderBy: [{ field: "incoming_count", direction: "desc" }],
      limit: 10,
    });
    expect(result.rows.length).toBeGreaterThan(0);
  });

  it("finds unanswered conversations from last 7 days", () => {
    const { result } = runIntent({
      type: "select",
      target: "conversations",
      select: ["id", "guest_name"],
      relatedFilters: [
        {
          relation: "messages",
          existence: "not_exists",
          conditions: [{ field: "direction", op: "equals", value: "outgoing" }],
        },
      ],
      limit: 50,
    });
    expect(result.rows.map((r) => r.id)).toEqual(
      expect.arrayContaining([12, 16, 18])
    );
  });

  it("finds untagged conversations from tomorrow", () => {
    const { result } = runIntent({
      type: "select",
      target: "conversations",
      select: ["id", "guest_name"],
      conditions: [{ field: "created_at", op: "equals", value: "2026-06-04" }],
      relatedFilters: [
        {
          relation: "tags",
          existence: "not_exists",
          conditions: [],
        },
      ],
      limit: 50,
    });
    expect(result.rows.length).toBeGreaterThan(0);
  });

  it("finds conversations not tagged as room_order", () => {
    const { result } = runIntent({
      type: "select",
      target: "conversations",
      select: ["id", "guest_name"],
      relatedFilters: [
        {
          relation: "tags",
          existence: "not_exists",
          conditions: [{ field: "label", op: "equals", value: "room_order" }],
        },
      ],
      limit: 50,
    });
    expect(result.rows.length).toBe(19);
  });

  it("supports OR for email or whatsapp channels", () => {
    const { result } = runIntent({
      type: "select",
      target: "conversations",
      select: ["id", "channel"],
      conditions: [
        { field: "channel", op: "equals", value: "email" },
        { field: "channel", op: "equals", value: "whatsapp" },
      ],
      conditionLogic: "or",
      limit: 50,
    });
    expect(result.rows.length).toBe(20);
  });

  it("finds messages starting with Hi", () => {
    const { result } = runIntent({
      type: "select",
      target: "messages",
      select: ["id", "body"],
      conditions: [{ field: "body", op: "starts_with", value: "Hi" }],
      limit: 50,
    });
    expect(result.rows.length).toBeGreaterThanOrEqual(2);
    expect(result.rows.every((r) => String(r.body).startsWith("Hi"))).toBe(true);
  });

  it("finds messages ending with thanks", () => {
    const { result } = runIntent({
      type: "select",
      target: "messages",
      select: ["id", "body"],
      conditions: [{ field: "body", op: "ends_with", value: "thanks" }],
      limit: 50,
    });
    expect(result.rows.some((r) => String(r.body).endsWith("thanks"))).toBe(true);
  });

  it("filters open conversations with more than 0 incoming messages", () => {
    const { result } = runIntent({
      type: "aggregate",
      target: "conversations",
      select: [
        "id",
        "guest_name",
        {
          fn: "count",
          field: "messages.id",
          alias: "incoming_count",
          filter: [{ field: "direction", op: "equals", value: "incoming" }],
        },
      ],
      conditions: [{ field: "status", op: "equals", value: "open" }],
      requiredTables: ["messages"],
      groupBy: ["id", "guest_name"],
      having: [
        {
          fn: "count",
          field: "messages.id",
          alias: "incoming_count",
          op: "gt",
          value: 0,
          filter: [{ field: "direction", op: "equals", value: "incoming" }],
        },
      ],
      limit: 50,
    });
    expect(result.rows.length).toBeGreaterThan(0);
  });
});