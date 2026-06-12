import type { Check } from "../types";
import { pass, warn, fail } from "./helpers";

function nodeTypes(jsonLd: Record<string, unknown>[]): string[] {
  return jsonLd
    .flatMap((n) => {
      const graph = n["@graph"];
      return Array.isArray(graph) ? (graph as Record<string, unknown>[]) : [n];
    })
    .flatMap((n) => {
      const t = n["@type"];
      return typeof t === "string" ? [t] : Array.isArray(t) ? (t as string[]) : [];
    });
}

const CONTENT_TYPES = ["Article", "NewsArticle", "BlogPosting", "Product", "FAQPage", "HowTo", "Recipe", "Event"];

export const structuredDataChecks: Check[] = [
  {
    id: "jsonld-present",
    category: "structured_data",
    weight: 2,
    appliesToScore: ["seo"],
    tier: "free",
    run(ctx) {
      const valid = ctx.extracted.jsonLd.filter((n) => !n.__parseError);
      return valid.length > 0 ? pass({ blocks: valid.length }) : fail();
    },
  },
  {
    id: "jsonld-errors",
    category: "structured_data",
    weight: 1,
    appliesToScore: ["seo"],
    tier: "paid",
    run(ctx) {
      const broken = ctx.extracted.jsonLd.filter((n) => n.__parseError).length;
      return broken === 0 ? pass() : fail({ broken });
    },
  },
  {
    id: "jsonld-org-or-website",
    category: "structured_data",
    weight: 2,
    appliesToScore: ["seo", "ads"],
    tier: "paid",
    run(ctx) {
      const types = nodeTypes(ctx.extracted.jsonLd);
      const found = types.some((t) => ["Organization", "WebSite", "LocalBusiness"].includes(t));
      return found ? pass() : warn();
    },
  },
  {
    id: "jsonld-page-type",
    category: "structured_data",
    weight: 2,
    appliesToScore: ["seo"],
    tier: "paid",
    run(ctx) {
      const types = nodeTypes(ctx.extracted.jsonLd);
      const matched = types.filter((t) => CONTENT_TYPES.includes(t));
      return matched.length > 0 ? pass({ types: matched.join(", ") }) : warn();
    },
  },
  {
    id: "og-twitter-meta",
    category: "structured_data",
    weight: 1,
    appliesToScore: ["seo"],
    tier: "free",
    run(ctx) {
      const og = ctx.extracted.ogTags;
      const required = ["og:title", "og:description", "og:image"];
      const missing = required.filter((k) => !og[k]);
      if (missing.length === 0) return pass();
      if (missing.length < required.length) return warn({ missing: missing.join(", ") });
      return fail();
    },
  },
];
