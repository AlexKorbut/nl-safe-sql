import type { Check } from "../types";
import { pass, warn, fail, na } from "./helpers";

export const indexabilityChecks: Check[] = [
  {
    id: "http-status",
    category: "indexability",
    weight: 3,
    appliesToScore: ["seo", "ads"],
    tier: "free",
    run(ctx) {
      if (ctx.http.status >= 400) return fail({ status: ctx.http.status });
      if (ctx.http.redirectChain.length > 2)
        return warn({ status: ctx.http.status, redirects: ctx.http.redirectChain.length });
      return pass({ status: ctx.http.status });
    },
  },
  {
    id: "robots-allowed",
    category: "indexability",
    weight: 3,
    appliesToScore: ["seo"],
    tier: "free",
    run(ctx) {
      if (!ctx.robots) return na();
      if (!ctx.robots.exists) return pass();
      return ctx.robots.allowsUrl ? pass() : fail();
    },
  },
  {
    id: "meta-noindex",
    category: "indexability",
    weight: 3,
    appliesToScore: ["seo"],
    tier: "free",
    run(ctx) {
      const robotsMeta = ctx.extracted.metaRobots?.toLowerCase() ?? "";
      const headerTag = ctx.http.headers["x-robots-tag"]?.toLowerCase() ?? "";
      if (robotsMeta.includes("noindex") || headerTag.includes("noindex"))
        return fail({ source: robotsMeta.includes("noindex") ? "meta" : "header" });
      return pass();
    },
  },
  {
    id: "canonical",
    category: "indexability",
    weight: 2,
    appliesToScore: ["seo"],
    tier: "paid",
    run(ctx) {
      const canonical = ctx.extracted.canonical;
      if (!canonical) return warn();
      let resolved: string;
      try {
        resolved = new URL(canonical, ctx.finalUrl).toString();
      } catch {
        return fail({ canonical });
      }
      const norm = (u: string) => u.replace(/\/$/, "");
      return norm(resolved) === norm(ctx.finalUrl)
        ? pass({ canonical: resolved })
        : warn({ canonical: resolved });
    },
  },
  {
    id: "sitemap",
    category: "indexability",
    weight: 1,
    appliesToScore: ["seo"],
    tier: "paid",
    run(ctx) {
      if (!ctx.sitemap) return na();
      if (!ctx.sitemap.found) return warn();
      if (ctx.sitemap.containsUrl === false) return warn({ urlCount: ctx.sitemap.urlCount ?? 0 });
      return pass({ urlCount: ctx.sitemap.urlCount ?? 0 });
    },
  },
  {
    id: "crawlable-links",
    category: "indexability",
    weight: 1,
    appliesToScore: ["seo"],
    tier: "paid",
    run(ctx) {
      const total = ctx.extracted.links.length;
      if (total === 0) return warn({ links: 0 });
      return pass({ links: total });
    },
  },
  {
    id: "lang-attribute",
    category: "indexability",
    weight: 1,
    appliesToScore: ["seo"],
    tier: "paid",
    run(ctx) {
      return ctx.extracted.lang ? pass({ lang: ctx.extracted.lang }) : warn();
    },
  },
];
