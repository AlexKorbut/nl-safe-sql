import { describe, it, expect } from "vitest";
import { computeScores, topIssues } from "@/server/audit/scoring";
import type { NamedCheckResult } from "@/server/audit/types";

function check(partial: Partial<NamedCheckResult> & { id: string }): NamedCheckResult {
  return {
    category: "technical",
    weight: 1,
    appliesToScore: ["seo"],
    tier: "free",
    score: 100,
    status: "pass",
    ...partial,
  };
}

describe("computeScores", () => {
  it("excludes na checks and renormalizes weights", () => {
    const checks = [
      check({ id: "a", score: 100, status: "pass", weight: 1 }),
      check({ id: "b", score: 0, status: "na", weight: 100 }),
    ];
    expect(computeScores(checks).categories.technical).toBe(100);
  });

  it("weights checks within a category", () => {
    const checks = [
      check({ id: "a", score: 100, weight: 3 }),
      check({ id: "b", score: 0, status: "fail", weight: 1 }),
    ];
    expect(computeScores(checks).categories.technical).toBe(75);
  });

  it("computes the ads score only from ads-applicable checks", () => {
    const checks = [
      check({ id: "a", score: 100, appliesToScore: ["seo"] }),
      check({ id: "b", score: 0, status: "fail", appliesToScore: ["ads"], category: "ads_landing" }),
    ];
    expect(computeScores(checks).ads).toBe(0);
  });

  it("overall is the mean of seo and ads", () => {
    const checks = [
      check({ id: "a", score: 100, appliesToScore: ["seo"] }),
      check({ id: "b", score: 0, status: "fail", appliesToScore: ["ads"], category: "ads_landing" }),
    ];
    const scores = computeScores(checks);
    expect(scores.overall).toBe(Math.round((scores.seo + scores.ads) / 2));
  });
});

describe("topIssues", () => {
  it("ranks by weighted severity", () => {
    const checks = [
      check({ id: "minor", score: 50, status: "warn", weight: 1 }),
      check({ id: "major", score: 0, status: "fail", weight: 3 }),
      check({ id: "ok", score: 100, status: "pass", weight: 3 }),
    ];
    expect(topIssues(checks, 2).map((c) => c.id)).toEqual(["major", "minor"]);
  });
});
