import robotsParser from "robots-parser";
import { AUDIT_USER_AGENT } from "./fetchPage";

export interface RobotsInfo {
  exists: boolean;
  allowsUrl: boolean;
  sitemapUrls: string[];
}

export async function collectRobots(pageUrl: string): Promise<RobotsInfo | null> {
  const robotsUrl = new URL("/robots.txt", pageUrl).toString();
  try {
    const res = await fetch(robotsUrl, {
      headers: { "user-agent": AUDIT_USER_AGENT },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { exists: false, allowsUrl: true, sitemapUrls: [] };
    const raw = await res.text();
    const parser = robotsParser(robotsUrl, raw);
    return {
      exists: true,
      // Googlebot is what matters for ranking
      allowsUrl: parser.isAllowed(pageUrl, "Googlebot") !== false,
      sitemapUrls: parser.getSitemaps(),
    };
  } catch {
    return null;
  }
}
