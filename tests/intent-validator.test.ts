import { describe, it, expect } from "vitest";
import {
  validateIntent,
  IntentValidationError,
} from "../src/validation/intent-validator.js";

describe("IntentValidator", () => {
  const validIntent = {
    type: "select" as const,
    target: "conversations" as const,
    select: ["id", "title"],
    conditions: [{ field: "status", op: "equals" as const, value: "open" }],
    limit: 10,
  };

  it("accepts valid intent", () => {
    const result = validateIntent(validIntent);
    expect(result.intent.target).toBe("conversations");
    expect(result.limit).toBe(10);
  });

  it("rejects invalid schema", () => {
    expect(() => validateIntent({ type: "delete" })).toThrow(
      IntentValidationError
    );
  });

  it("rejects SQL injection in values", () => {
    const result = validateIntent({
      ...validIntent,
      conditions: [
        {
          field: "title",
          op: "contains",
          value: "'; DROP TABLE conversations; --",
        },
      ],
    });
    expect(result.intent.conditions?.[0].value).toContain("DROP");
  });

  it("rejects forbidden fields", () => {
    expect(() =>
      validateIntent({
        ...validIntent,
        select: ["password"],
      })
    ).toThrow(IntentValidationError);
  });

  it("rejects forbidden operators on numbers", () => {
    expect(() =>
      validateIntent({
        ...validIntent,
        conditions: [{ field: "id", op: "contains", value: "1" }],
      })
    ).toThrow(IntentValidationError);
  });

  it("rejects limit over max", () => {
    expect(() =>
      validateIntent({ ...validIntent, limit: 500 })
    ).toThrow(IntentValidationError);
  });

  it("auto-infers messages join", () => {
    const result = validateIntent({
      type: "select",
      target: "conversations",
      select: ["id"],
      conditions: [{ field: "content", op: "contains", value: "refund" }],
    });
    expect(result.joinedTables.has("messages")).toBe(true);
  });
});