import type { CheckResult } from "../types";

export function pass(detailsParams?: CheckResult["detailsParams"], evidence?: unknown): CheckResult {
  return { score: 100, status: "pass", detailsParams, evidence };
}

export function warn(detailsParams?: CheckResult["detailsParams"], evidence?: unknown): CheckResult {
  return { score: 50, status: "warn", detailsParams, evidence };
}

export function fail(detailsParams?: CheckResult["detailsParams"], evidence?: unknown): CheckResult {
  return { score: 0, status: "fail", detailsParams, evidence };
}

export function na(): CheckResult {
  return { score: 0, status: "na" };
}

/** Maps a metric to pass/warn/fail using good/poor thresholds (lower is better). */
export function threshold(
  value: number,
  good: number,
  poor: number,
  params?: CheckResult["detailsParams"]
): CheckResult {
  if (value <= good) return pass(params);
  if (value <= poor) return warn(params);
  return fail(params);
}

/** Converts a 0-100 continuous score into a CheckResult. */
export function scaled(score: number, params?: CheckResult["detailsParams"]): CheckResult {
  const s = Math.max(0, Math.min(100, Math.round(score)));
  return {
    score: s,
    status: s >= 80 ? "pass" : s >= 50 ? "warn" : "fail",
    detailsParams: params,
  };
}
