import type { Check } from "../types";
import { pass, warn, fail, na, threshold, scaled } from "./helpers";

export const technicalChecks: Check[] = [
  {
    id: "cwv-lcp",
    category: "technical",
    weight: 3,
    appliesToScore: ["seo", "ads"],
    tier: "free",
    run(ctx) {
      const field = ctx.psi?.mobile?.crux?.lcpMs;
      const lab = ctx.psi?.mobile?.lab.lcpMs;
      const lcp = field ?? lab;
      if (lcp === undefined || lcp === 0) return na();
      return threshold(lcp, 2500, 4000, { lcpMs: Math.round(lcp), source: field ? "field" : "lab" });
    },
  },
  {
    id: "cwv-inp",
    category: "technical",
    weight: 2,
    appliesToScore: ["seo", "ads"],
    tier: "free",
    run(ctx) {
      const inp = ctx.psi?.mobile?.crux?.inp;
      if (inp === undefined) return na();
      return threshold(inp, 200, 500, { inpMs: inp });
    },
  },
  {
    id: "cwv-cls",
    category: "technical",
    weight: 2,
    appliesToScore: ["seo", "ads"],
    tier: "free",
    run(ctx) {
      const cls = ctx.psi?.mobile?.crux?.cls ?? ctx.psi?.mobile?.lab.cls;
      if (cls === undefined) return na();
      return threshold(cls, 0.1, 0.25, { cls: Number(cls.toFixed(3)) });
    },
  },
  {
    id: "psi-performance",
    category: "technical",
    weight: 3,
    appliesToScore: ["seo", "ads"],
    tier: "free",
    run(ctx) {
      const score = ctx.psi?.mobile?.performanceScore;
      if (score === undefined) return na();
      return scaled(score, { score });
    },
  },
  {
    id: "ttfb",
    category: "technical",
    weight: 1,
    appliesToScore: ["seo", "ads"],
    tier: "paid",
    run(ctx) {
      return threshold(ctx.http.ttfbMs, 800, 1800, { ttfbMs: ctx.http.ttfbMs });
    },
  },
  {
    id: "https",
    category: "technical",
    weight: 3,
    appliesToScore: ["seo", "ads"],
    tier: "free",
    run(ctx) {
      return ctx.http.https ? pass() : fail();
    },
  },
  {
    id: "viewport-meta",
    category: "technical",
    weight: 2,
    appliesToScore: ["seo", "ads"],
    tier: "free",
    run(ctx) {
      const v = ctx.extracted.viewport;
      if (!v) return fail();
      return v.includes("width=device-width") ? pass() : warn({ viewport: v });
    },
  },
  {
    id: "image-optimization",
    category: "technical",
    weight: 1,
    appliesToScore: ["seo"],
    tier: "paid",
    run(ctx) {
      const audits = ctx.psi?.mobile?.audits;
      if (!audits) return na();
      const scores = ["modern-image-formats", "uses-optimized-images"]
        .map((id) => audits[id]?.score)
        .filter((s): s is number => s !== null && s !== undefined);
      if (!scores.length) return na();
      return scaled((scores.reduce((a, b) => a + b, 0) / scores.length) * 100);
    },
  },
  {
    id: "render-blocking",
    category: "technical",
    weight: 1,
    appliesToScore: ["seo", "ads"],
    tier: "paid",
    run(ctx) {
      const score = ctx.psi?.mobile?.audits["render-blocking-resources"]?.score;
      if (score === null || score === undefined) return na();
      return scaled(score * 100);
    },
  },
  {
    id: "html-size",
    category: "technical",
    weight: 1,
    appliesToScore: ["seo"],
    tier: "paid",
    run(ctx) {
      const kb = Math.round(Buffer.byteLength(ctx.html, "utf8") / 1024);
      return threshold(kb, 500, 1500, { sizeKb: kb });
    },
  },
];
