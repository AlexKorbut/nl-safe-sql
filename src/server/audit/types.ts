import type { CheerioAPI } from "cheerio";

export interface PsiResult {
  performanceScore: number; // Lighthouse 0-100
  crux?: { lcpMs?: number; inp?: number; cls?: number };
  lab: { lcpMs: number; cls: number; tbtMs: number };
  audits: Record<string, { score: number | null }>;
}

export interface LlmAssessment {
  eeat: { score: number; reasons: string[] };
  helpfulness: { score: number; reasons: string[] };
  citability: { score: number; reasons: string[] };
  clarity: { score: number; reasons: string[] };
  adsRelevance: { score: number; misleadingFlags: string[] };
}

export interface ExtractedPage {
  title?: string;
  metaDescription?: string;
  h1s: string[];
  headings: { level: number; text: string }[];
  mainText: string;
  wordCount: number;
  links: { href: string; text: string; internal: boolean }[];
  images: { src: string; alt?: string }[];
  jsonLd: Record<string, unknown>[];
  ogTags: Record<string, string>;
  canonical?: string;
  metaRobots?: string;
  lang?: string;
  viewport?: string;
  hasForm: boolean;
  hasTelLink: boolean;
  metaRefresh?: string;
}

export interface AuditContext {
  url: string;
  finalUrl: string;
  http: {
    status: number;
    redirectChain: string[];
    headers: Record<string, string>;
    https: boolean;
    ttfbMs: number;
  };
  html: string;
  $: CheerioAPI;
  extracted: ExtractedPage;
  robots: {
    exists: boolean;
    allowsUrl: boolean;
    sitemapUrls: string[];
  } | null;
  sitemap: { found: boolean; urlCount?: number; containsUrl?: boolean } | null;
  psi: { mobile?: PsiResult; desktop?: PsiResult } | null;
  llm: LlmAssessment | null;
  brokenLinkSample: { url: string; status: number }[];
}

export type CheckCategory =
  | "technical"
  | "indexability"
  | "structured_data"
  | "content_eeat"
  | "ads_landing";

export type CheckStatus = "pass" | "warn" | "fail" | "na";

export interface CheckResult {
  score: number; // 0-100
  status: CheckStatus;
  detailsParams?: Record<string, string | number>;
  evidence?: unknown;
}

export interface Check {
  id: string;
  category: CheckCategory;
  weight: number;
  appliesToScore: ("seo" | "ads")[];
  tier: "free" | "paid";
  run(ctx: AuditContext): CheckResult;
}

export interface NamedCheckResult extends CheckResult {
  id: string;
  category: CheckCategory;
  weight: number;
  appliesToScore: ("seo" | "ads")[];
  tier: "free" | "paid";
}

export interface AuditScores {
  overall: number;
  seo: number;
  ads: number;
  categories: Record<CheckCategory, number>;
}

export interface AuditReport {
  checks: NamedCheckResult[];
  scores: AuditScores;
}

export type ProgressStep =
  | "fetching"
  | "parsing"
  | "robots"
  | "sitemap"
  | "links"
  | "psi_mobile"
  | "psi_desktop"
  | "llm"
  | "scoring";

export type ProgressCallback = (step: ProgressStep, pct: number) => void;
