import type { Check } from "../types";
import { pass, warn, fail, na, scaled } from "./helpers";

const PHONE_RE = /(\+7|8)[\s(-]?\d{3}[\s)-]?\s?\d{3}[\s-]?\d{2}[\s-]?\d{2}|\+?\d{1,3}[\s(-]?\d{2,4}[\s)-]?\d{3}[\s-]?\d{2,4}/;
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.]+/;
const PRIVACY_RE = /privacy|terms|политик|конфиденциальн|оферт|соглашени/i;
const CTA_RE = /\b(buy|order|sign up|get started|subscribe|book|request|download|try|купить|заказать|оставить заявку|записаться|подписаться|получить|скачать|попробовать)\b/i;
const POPUP_MARKER_RE = /class="[^"]*(modal|popup|overlay|interstitial)[^"]*"|onesignal|push-prompt/i;
const ADDRESS_RE = /\b(ул\.|улица|просп|street|st\.|ave\.|suite|офис|office)\b/i;

export const adsChecks: Check[] = [
  {
    id: "ads-contact-info",
    category: "ads_landing",
    weight: 3,
    appliesToScore: ["ads"],
    tier: "free",
    run(ctx) {
      const text = ctx.extracted.mainText + " " + ctx.html.slice(-30000);
      const hasPhone = PHONE_RE.test(text) || ctx.extracted.hasTelLink;
      const hasEmail = EMAIL_RE.test(text);
      const hasContactLink = ctx.extracted.links.some((l) => /contact|kontakt|контакт/i.test(l.href + l.text));
      if (hasPhone || hasEmail) return pass();
      if (hasContactLink) return warn();
      return fail();
    },
  },
  {
    id: "ads-privacy-policy",
    category: "ads_landing",
    weight: 3,
    appliesToScore: ["ads"],
    tier: "free",
    run(ctx) {
      const found = ctx.extracted.links.some((l) => PRIVACY_RE.test(l.href + " " + l.text));
      return found ? pass() : fail();
    },
  },
  {
    id: "ads-speed",
    category: "ads_landing",
    weight: 3,
    appliesToScore: ["ads"],
    tier: "free",
    run(ctx) {
      const score = ctx.psi?.mobile?.performanceScore;
      if (score === undefined) return na();
      return scaled(score, { score });
    },
  },
  {
    id: "ads-mobile-usability",
    category: "ads_landing",
    weight: 2,
    appliesToScore: ["ads"],
    tier: "paid",
    run(ctx) {
      if (!ctx.extracted.viewport) return fail();
      const audits = ctx.psi?.mobile?.audits;
      const scores = ["tap-targets", "font-size"]
        .map((id) => audits?.[id]?.score)
        .filter((s): s is number => s !== null && s !== undefined);
      if (!scores.length) return pass();
      return scaled(((scores.reduce((a, b) => a + b, 0) / scores.length) * 50 + 50));
    },
  },
  {
    id: "ads-interstitial-heuristic",
    category: "ads_landing",
    weight: 2,
    appliesToScore: ["ads", "seo"],
    tier: "paid",
    run(ctx) {
      return POPUP_MARKER_RE.test(ctx.html) ? warn() : pass();
    },
  },
  {
    id: "ads-cta-form",
    category: "ads_landing",
    weight: 2,
    appliesToScore: ["ads"],
    tier: "paid",
    run(ctx) {
      if (ctx.extracted.hasForm || ctx.extracted.hasTelLink) return pass();
      const hasCta = ctx.extracted.links.some((l) => CTA_RE.test(l.text));
      return hasCta ? pass() : warn();
    },
  },
  {
    id: "ads-trust-signals",
    category: "ads_landing",
    weight: 2,
    appliesToScore: ["ads"],
    tier: "paid",
    run(ctx) {
      let points = 0;
      if (ctx.http.https) points++;
      if (
        ctx.extracted.jsonLd.some((n) => {
          const t = n["@type"];
          return t === "Organization" || t === "LocalBusiness";
        })
      )
        points++;
      if (ADDRESS_RE.test(ctx.html.slice(-30000))) points++;
      if (points >= 2) return pass({ points });
      if (points === 1) return warn({ points });
      return fail({ points });
    },
  },
  {
    id: "ads-broken-links",
    category: "ads_landing",
    weight: 1,
    appliesToScore: ["ads", "seo"],
    tier: "paid",
    run(ctx) {
      const broken = ctx.brokenLinkSample.length;
      if (broken === 0) return pass();
      if (broken <= 1) return warn({ broken }, ctx.brokenLinkSample);
      return fail({ broken }, ctx.brokenLinkSample);
    },
  },
  {
    id: "ads-popunder-redirect",
    category: "ads_landing",
    weight: 2,
    appliesToScore: ["ads"],
    tier: "paid",
    run(ctx) {
      if (ctx.extracted.metaRefresh) return fail({ reason: "meta-refresh" });
      const hosts = new Set(
        [ctx.url, ...ctx.http.redirectChain, ctx.finalUrl].map((u) => {
          try {
            return new URL(u).hostname.replace(/^www\./, "");
          } catch {
            return "";
          }
        })
      );
      return hosts.size > 1 ? warn({ hosts: [...hosts].join(" → ") }) : pass();
    },
  },
  {
    id: "llm-ads-relevance",
    category: "ads_landing",
    weight: 3,
    appliesToScore: ["ads"],
    tier: "paid",
    run(ctx) {
      if (!ctx.llm) return na();
      const { score, misleadingFlags } = ctx.llm.adsRelevance;
      const result = scaled(score, { flags: misleadingFlags.length });
      return { ...result, evidence: misleadingFlags };
    },
  },
];
