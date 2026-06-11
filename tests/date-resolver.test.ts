import { describe, it, expect } from "vitest";
import { resolveDateValue, DateResolutionError } from "../src/sql/date-resolver.js";

describe("DateResolver", () => {
  const now = new Date("2026-06-03T12:00:00.000Z");

  it("passes through ISO dates", () => {
    expect(resolveDateValue("2026-05-01", now)).toBe("2026-05-01");
  });

  it("resolves -7 days", () => {
    expect(resolveDateValue("-7 days", now)).toBe("2026-05-27");
  });

  it("resolves today", () => {
    expect(resolveDateValue("today", now)).toBe("2026-06-03");
  });

  it("resolves this month", () => {
    expect(resolveDateValue("this month", now)).toBe("2026-06-01");
  });

  it("resolves tomorrow", () => {
    expect(resolveDateValue("tomorrow", now)).toBe("2026-06-04");
  });

  it("resolves +3 days", () => {
    expect(resolveDateValue("+3 days", now)).toBe("2026-06-06");
  });

  it("rejects unknown expressions", () => {
    expect(() => resolveDateValue("next quarter", now)).toThrow(
      DateResolutionError
    );
  });
});