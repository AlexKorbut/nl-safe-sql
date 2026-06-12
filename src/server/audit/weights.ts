import type { CheckCategory } from "./types";

/** Category weights for the SEO top-level score. Tune here, nowhere else. */
export const SEO_CATEGORY_WEIGHTS: Record<CheckCategory, number> = {
  technical: 0.25,
  indexability: 0.2,
  structured_data: 0.15,
  content_eeat: 0.4,
  ads_landing: 0, // ads checks feed the ads score, not seo (unless flagged)
};

export const GRADE_BANDS = [
  { min: 90, grade: "excellent" },
  { min: 70, grade: "good" },
  { min: 50, grade: "needs_work" },
  { min: 0, grade: "poor" },
] as const;

export function gradeFor(score: number): string {
  return GRADE_BANDS.find((b) => score >= b.min)?.grade ?? "poor";
}
