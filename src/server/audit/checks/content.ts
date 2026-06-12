import type { Check, AuditContext, CheckResult } from "../types";
import { pass, warn, fail, na, scaled } from "./helpers";

const ABOUT_CONTACT_RE = /\/(about|contact|o-nas|kontakty|about-us|contacts)\b|о нас|о компании|контакты/i;
const AUTHOR_RE = /author|byline|автор/i;
const DATE_RE = /\b(20\d{2})[-./](\d{1,2})[-./](\d{1,2})\b|\b\d{1,2}\s+(января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря|january|february|march|april|may|june|july|august|september|october|november|december)\s+20\d{2}/i;

function llmCheck(
  id: string,
  weight: number,
  pick: (llm: NonNullable<AuditContext["llm"]>) => { score: number; reasons: string[] },
  applies: ("seo" | "ads")[] = ["seo"]
): Check {
  return {
    id,
    category: "content_eeat",
    weight,
    appliesToScore: applies,
    tier: "paid",
    run(ctx): CheckResult {
      if (!ctx.llm) return na();
      const { score, reasons } = pick(ctx.llm);
      return { ...scaled(score), evidence: reasons };
    },
  };
}

export const contentChecks: Check[] = [
  {
    id: "title-tag",
    category: "content_eeat",
    weight: 2,
    appliesToScore: ["seo", "ads"],
    tier: "free",
    run(ctx) {
      const title = ctx.extracted.title;
      if (!title) return fail();
      if (title.length < 15 || title.length > 65) return warn({ length: title.length });
      return pass({ length: title.length });
    },
  },
  {
    id: "meta-description",
    category: "content_eeat",
    weight: 1,
    appliesToScore: ["seo"],
    tier: "free",
    run(ctx) {
      const desc = ctx.extracted.metaDescription;
      if (!desc) return fail();
      if (desc.length < 50 || desc.length > 160) return warn({ length: desc.length });
      return pass({ length: desc.length });
    },
  },
  {
    id: "h1",
    category: "content_eeat",
    weight: 2,
    appliesToScore: ["seo", "ads"],
    tier: "free",
    run(ctx) {
      const count = ctx.extracted.h1s.length;
      if (count === 0) return fail({ count });
      if (count > 1) return warn({ count });
      return pass({ count });
    },
  },
  {
    id: "content-depth",
    category: "content_eeat",
    weight: 3,
    appliesToScore: ["seo"],
    tier: "free",
    run(ctx) {
      const words = ctx.extracted.wordCount;
      if (words < 150) return fail({ words });
      if (words < 300) return warn({ words });
      return pass({ words });
    },
  },
  {
    id: "image-alt",
    category: "content_eeat",
    weight: 1,
    appliesToScore: ["seo"],
    tier: "paid",
    run(ctx) {
      const images = ctx.extracted.images;
      if (images.length === 0) return na();
      const withAlt = images.filter((i) => i.alt && i.alt.trim().length > 0).length;
      const pct = Math.round((withAlt / images.length) * 100);
      return scaled(pct, { pct, total: images.length });
    },
  },
  {
    id: "author-byline",
    category: "content_eeat",
    weight: 1,
    appliesToScore: ["seo"],
    tier: "paid",
    run(ctx) {
      const hasPersonLd = ctx.extracted.jsonLd.some((n) => {
        const t = n["@type"];
        return t === "Person" || "author" in n;
      });
      const hasByline = AUTHOR_RE.test(ctx.html.slice(0, 100000));
      return hasPersonLd || hasByline ? pass() : warn();
    },
  },
  {
    id: "freshness",
    category: "content_eeat",
    weight: 1,
    appliesToScore: ["seo"],
    tier: "paid",
    run(ctx) {
      const hasLdDate = ctx.extracted.jsonLd.some(
        (n) => "datePublished" in n || "dateModified" in n
      );
      const hasVisibleDate = DATE_RE.test(ctx.extracted.mainText.slice(0, 5000));
      return hasLdDate || hasVisibleDate ? pass() : warn();
    },
  },
  {
    id: "about-contact-pages",
    category: "content_eeat",
    weight: 1,
    appliesToScore: ["seo", "ads"],
    tier: "paid",
    run(ctx) {
      const found = ctx.extracted.links.some(
        (l) => l.internal && (ABOUT_CONTACT_RE.test(l.href) || ABOUT_CONTACT_RE.test(l.text))
      );
      return found ? pass() : warn();
    },
  },
  {
    id: "heading-structure",
    category: "content_eeat",
    weight: 1,
    appliesToScore: ["seo"],
    tier: "paid",
    run(ctx) {
      const levels = ctx.extracted.headings.map((h) => h.level);
      if (levels.length === 0) return fail();
      let skips = 0;
      for (let i = 1; i < levels.length; i++) {
        if (levels[i] - levels[i - 1] > 1) skips++;
      }
      return skips === 0 ? pass() : warn({ skips });
    },
  },
  llmCheck("llm-eeat", 3, (llm) => llm.eeat),
  llmCheck("llm-helpfulness", 3, (llm) => llm.helpfulness),
  llmCheck("llm-ai-citability", 3, (llm) => llm.citability),
  llmCheck("llm-clarity-structure", 2, (llm) => llm.clarity),
];
