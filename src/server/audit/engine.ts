import type {
  AuditContext,
  AuditReport,
  NamedCheckResult,
  ProgressCallback,
} from "./types";
import { allChecks } from "./checks";
import { computeScores } from "./scoring";
import { fetchPage } from "./collectors/fetchPage";
import { parseHtml } from "./collectors/parseHtml";
import { collectRobots } from "./collectors/robots";
import { collectSitemap } from "./collectors/sitemap";
import { collectPsi } from "./collectors/psi";
import { collectBrokenLinks } from "./collectors/links";
import { collectLlmAssessment } from "./collectors/llm";

export class SiteUnreachableError extends Error {
  constructor(public readonly reason: "unreachable" | "blocked" | "non_html") {
    super(`site ${reason}`);
  }
}

export interface RunAuditOptions {
  locale?: string;
  withLlm?: boolean;
  onProgress?: ProgressCallback;
}

export async function runAudit(url: string, opts: RunAuditOptions = {}): Promise<AuditReport> {
  const progress: ProgressCallback = opts.onProgress ?? (() => {});

  progress("fetching", 5);
  let page;
  try {
    page = await fetchPage(url);
  } catch {
    throw new SiteUnreachableError("unreachable");
  }
  if (page.status === 403 || page.status === 429) throw new SiteUnreachableError("blocked");
  if (page.status >= 400 && !page.html) throw new SiteUnreachableError("unreachable");
  const contentType = page.headers["content-type"] ?? "";
  if (contentType && !contentType.includes("html")) throw new SiteUnreachableError("non_html");

  progress("parsing", 15);
  const { $, extracted } = parseHtml(page.html, page.finalUrl);

  progress("robots", 20);
  const robots = await collectRobots(page.finalUrl);

  progress("sitemap", 25);
  const sitemap = await collectSitemap(page.finalUrl, robots?.sitemapUrls ?? []);

  progress("links", 30);
  const brokenLinkSample = await collectBrokenLinks(extracted.links, page.finalUrl);

  progress("psi_mobile", 40);
  const psiMobile = await collectPsi(page.finalUrl, "mobile");
  progress("psi_desktop", 65);
  const psiDesktop = await collectPsi(page.finalUrl, "desktop");

  progress("llm", 85);
  const llm =
    opts.withLlm === false
      ? null
      : await collectLlmAssessment(extracted, opts.locale ?? "en");

  const ctx: AuditContext = {
    url,
    finalUrl: page.finalUrl,
    http: {
      status: page.status,
      redirectChain: page.redirectChain,
      headers: page.headers,
      https: page.https,
      ttfbMs: page.ttfbMs,
    },
    html: page.html,
    $,
    extracted,
    robots,
    sitemap,
    psi: psiMobile || psiDesktop ? { mobile: psiMobile ?? undefined, desktop: psiDesktop ?? undefined } : null,
    llm,
    brokenLinkSample,
  };

  progress("scoring", 95);
  const checks: NamedCheckResult[] = allChecks.map((check) => {
    let result;
    try {
      result = check.run(ctx);
    } catch {
      result = { score: 0, status: "na" as const };
    }
    return {
      id: check.id,
      category: check.category,
      weight: check.weight,
      appliesToScore: check.appliesToScore,
      tier: check.tier,
      ...result,
    };
  });

  return { checks, scores: computeScores(checks) };
}
