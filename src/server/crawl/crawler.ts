import { AUDIT_USER_AGENT } from "@/server/audit/collectors/fetchPage";

export interface CrawlResult {
  url: string;
  status: number;
  title?: string;
  h1?: string;
  wordCount: number;
  links: string[];
}

/**
 * Deep site crawl: discovers and analyzes up to 100 pages.
 * Returns paginated crawl results for processing.
 */
export async function crawlSite(
  startUrl: string,
  maxPages = 100,
  onProgress?: (current: number, total: number) => void
): Promise<CrawlResult[]> {
  const results: CrawlResult[] = [];
  const visited = new Set<string>();
  const queue = [startUrl];
  const baseHost = new URL(startUrl).hostname;

  while (queue.length > 0 && results.length < maxPages) {
    const url = queue.shift()!;
    if (visited.has(url)) continue;
    visited.add(url);

    try {
      const res = await fetch(url, {
        headers: { "user-agent": AUDIT_USER_AGENT },
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) continue;
      const html = await res.text();
      if (!res.headers.get("content-type")?.includes("html")) continue;

      const doc = new DOMParser().parseFromString(html, "text/html");
      const title = doc.querySelector("title")?.textContent;
      const h1 = doc.querySelector("h1")?.textContent;
      const text = doc.body?.textContent?.replace(/\s+/g, " ").trim() ?? "";
      const wordCount = text.split(/\s+/).length;

      const newLinks = Array.from(doc.querySelectorAll("a[href]"))
        .map((a) => {
          try {
            const href = (a as HTMLAnchorElement).href;
            const urlObj = new URL(href);
            return urlObj.hostname === baseHost ? urlObj.toString() : null;
          } catch {
            return null;
          }
        })
        .filter((u): u is string => u !== null && !visited.has(u))
        .slice(0, 10);

      results.push({
        url,
        status: res.status,
        title: title?.trim(),
        h1: h1?.trim(),
        wordCount,
        links: newLinks,
      });

      queue.push(...newLinks);
      onProgress?.(results.length, maxPages);
    } catch {
      // Skip unreachable pages
    }
  }

  return results;
}
