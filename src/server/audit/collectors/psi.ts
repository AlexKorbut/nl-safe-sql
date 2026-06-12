import { env } from "@/lib/env";
import type { PsiResult } from "../types";

const PSI_ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

const LIGHTHOUSE_AUDIT_IDS = [
  "modern-image-formats",
  "uses-optimized-images",
  "render-blocking-resources",
  "tap-targets",
  "font-size",
];

export async function collectPsi(
  url: string,
  strategy: "mobile" | "desktop"
): Promise<PsiResult | null> {
  const params = new URLSearchParams({ url, strategy });
  if (env.PSI_API_KEY) params.set("key", env.PSI_API_KEY);

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${PSI_ENDPOINT}?${params}`, {
        signal: AbortSignal.timeout(60000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const lighthouse = data.lighthouseResult;
      if (!lighthouse) return null;

      const metrics = data.loadingExperience?.metrics ?? {};
      const audits: PsiResult["audits"] = {};
      for (const id of LIGHTHOUSE_AUDIT_IDS) {
        if (lighthouse.audits?.[id]) audits[id] = { score: lighthouse.audits[id].score };
      }

      return {
        performanceScore: Math.round((lighthouse.categories?.performance?.score ?? 0) * 100),
        crux: {
          lcpMs: metrics.LARGEST_CONTENTFUL_PAINT_MS?.percentile,
          inp: metrics.INTERACTION_TO_NEXT_PAINT?.percentile,
          cls: metrics.CUMULATIVE_LAYOUT_SHIFT_SCORE?.percentile
            ? metrics.CUMULATIVE_LAYOUT_SHIFT_SCORE.percentile / 100
            : undefined,
        },
        lab: {
          lcpMs: lighthouse.audits?.["largest-contentful-paint"]?.numericValue ?? 0,
          cls: lighthouse.audits?.["cumulative-layout-shift"]?.numericValue ?? 0,
          tbtMs: lighthouse.audits?.["total-blocking-time"]?.numericValue ?? 0,
        },
        audits,
      };
    } catch {
      continue;
    }
  }
  return null;
}
