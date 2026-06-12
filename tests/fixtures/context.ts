import * as cheerio from "cheerio";
import type { AuditContext, ExtractedPage } from "@/server/audit/types";

const BASE_HTML = "<html><body><p>fixture</p></body></html>";

export function makeExtracted(overrides: Partial<ExtractedPage> = {}): ExtractedPage {
  return {
    title: "A perfectly reasonable page title here",
    metaDescription: "A meta description that is long enough to be considered useful by search engines.",
    h1s: ["Main heading"],
    headings: [{ level: 1, text: "Main heading" }],
    mainText: Array(400).fill("word").join(" "),
    wordCount: 400,
    links: [],
    images: [],
    jsonLd: [],
    ogTags: {},
    canonical: undefined,
    metaRobots: undefined,
    lang: "en",
    viewport: "width=device-width, initial-scale=1",
    hasForm: false,
    hasTelLink: false,
    metaRefresh: undefined,
    ...overrides,
  };
}

type ContextOverrides = Partial<Omit<AuditContext, "extracted">> & {
  extracted?: Partial<ExtractedPage>;
};

export function makeContext(overrides: ContextOverrides = {}): AuditContext {
  const { extracted, ...rest } = overrides;
  return {
    url: "https://example.com/",
    finalUrl: "https://example.com/",
    http: {
      status: 200,
      redirectChain: [],
      headers: {},
      https: true,
      ttfbMs: 300,
    },
    html: BASE_HTML,
    $: cheerio.load(BASE_HTML),
    extracted: makeExtracted(extracted),
    robots: { exists: true, allowsUrl: true, sitemapUrls: [] },
    sitemap: { found: true, urlCount: 10, containsUrl: true },
    psi: null,
    llm: null,
    brokenLinkSample: [],
    ...rest,
  };
}
