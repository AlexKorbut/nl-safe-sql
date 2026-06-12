import type { Check } from "../types";
import { pass, warn, fail } from "./helpers";

/**
 * hreflang validation (Wave 4):
 * Checks for proper alternate language links.
 */
export const hreflangCheck: Check = {
  id: "hreflang",
  category: "indexability",
  weight: 1,
  appliesToScore: ["seo"],
  tier: "paid",
  run(ctx) {
    const hreflangs = ctx.$('link[rel="alternate"][hreflang]').toArray();

    if (hreflangs.length === 0) {
      // Not applicable if site is single-language
      if (!ctx.extracted.lang || ctx.extracted.lang.startsWith("en")) {
        return pass();
      }
      return warn();
    }

    const entries = hreflangs
      .map((el) => ({
        lang: ctx.$(el).attr("hreflang"),
        href: ctx.$(el).attr("href"),
      }))
      .filter((e) => e.lang && e.href);

    let issues = 0;
    const seenHrefs = new Set<string>();

    for (const entry of entries) {
      // Check for valid language code
      if (!entry.lang!.match(/^(x-|[a-z]{2}(-[A-Z]{2})?)$/)) {
        issues++;
      }

      // Check for proper URL format
      if (!entry.href!.startsWith("http")) {
        issues++;
      }

      // Check for duplicates
      if (seenHrefs.has(entry.href!)) {
        issues++;
      }
      seenHrefs.add(entry.href!);
    }

    if (issues === 0) return pass({ count: entries.length });
    if (issues <= entries.length / 2) return warn({ count: entries.length, issues });
    return fail({ count: entries.length, issues });
  },
};
