import { AUDIT_USER_AGENT } from "./fetchPage";

export interface SitemapInfo {
  found: boolean;
  urlCount?: number;
  containsUrl?: boolean;
}

export async function collectSitemap(
  pageUrl: string,
  sitemapUrlsFromRobots: string[]
): Promise<SitemapInfo | null> {
  const candidates = sitemapUrlsFromRobots.length
    ? sitemapUrlsFromRobots.slice(0, 3)
    : [new URL("/sitemap.xml", pageUrl).toString()];

  for (const sitemapUrl of candidates) {
    try {
      const res = await fetch(sitemapUrl, {
        headers: { "user-agent": AUDIT_USER_AGENT },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) continue;
      const xml = await res.text();
      // Lightweight scan — full XML parsing is overkill for presence checks.
      const locs = xml.match(/<loc>([^<]+)<\/loc>/g) ?? [];
      const urls = locs.slice(0, 2000).map((l) => l.replace(/<\/?loc>/g, "").trim());
      const normalized = pageUrl.replace(/\/$/, "");
      return {
        found: true,
        urlCount: locs.length,
        containsUrl: urls.some((u) => u.replace(/\/$/, "") === normalized),
      };
    } catch {
      continue;
    }
  }
  return { found: false };
}
