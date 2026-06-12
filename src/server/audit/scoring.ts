import type { AuditScores, CheckCategory, NamedCheckResult } from "./types";
import { SEO_CATEGORY_WEIGHTS } from "./weights";

const CATEGORIES: CheckCategory[] = [
  "technical",
  "indexability",
  "structured_data",
  "content_eeat",
  "ads_landing",
];

function weightedAverage(checks: NamedCheckResult[]): number {
  const active = checks.filter((c) => c.status !== "na");
  const totalWeight = active.reduce((sum, c) => sum + c.weight, 0);
  if (totalWeight === 0) return 0;
  return Math.round(active.reduce((sum, c) => sum + c.score * c.weight, 0) / totalWeight);
}

export function computeScores(checks: NamedCheckResult[]): AuditScores {
  const categories = {} as Record<CheckCategory, number>;
  for (const cat of CATEGORIES) {
    categories[cat] = weightedAverage(checks.filter((c) => c.category === cat));
  }

  // SEO score: category averages over seo-applicable checks, weighted per weights.ts.
  // Categories with no active checks are excluded and weights renormalize.
  let seoSum = 0;
  let seoWeight = 0;
  for (const cat of CATEGORIES) {
    const w = SEO_CATEGORY_WEIGHTS[cat];
    if (w === 0) continue;
    const catChecks = checks.filter(
      (c) => c.category === cat && c.appliesToScore.includes("seo") && c.status !== "na"
    );
    if (catChecks.length === 0) continue;
    seoSum += weightedAverage(catChecks) * w;
    seoWeight += w;
  }
  const seo = seoWeight > 0 ? Math.round(seoSum / seoWeight) : 0;

  const ads = weightedAverage(checks.filter((c) => c.appliesToScore.includes("ads")));

  return {
    overall: Math.round((seo + ads) / 2),
    seo,
    ads,
    categories,
  };
}

/** Worst weighted failures — surfaced as "top issues" on the free tier. */
export function topIssues(checks: NamedCheckResult[], limit = 3): NamedCheckResult[] {
  return checks
    .filter((c) => c.status === "fail" || c.status === "warn")
    .sort((a, b) => (100 - b.score) * b.weight - (100 - a.score) * a.weight)
    .slice(0, limit);
}
