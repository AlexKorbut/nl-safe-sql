export const AUDIT_USER_AGENT =
  "Mozilla/5.0 (compatible; ReadinessAuditBot/1.0; +https://github.com/alexkorbut/GoogleSaas)";

export interface FetchedPage {
  finalUrl: string;
  status: number;
  redirectChain: string[];
  headers: Record<string, string>;
  https: boolean;
  ttfbMs: number;
  html: string;
}

/** Fetches the page following redirects manually so the chain is recorded. */
export async function fetchPage(url: string, timeoutMs = 15000): Promise<FetchedPage> {
  const redirectChain: string[] = [];
  let current = url;
  const started = Date.now();
  let res: Response | null = null;

  for (let hop = 0; hop < 10; hop++) {
    res = await fetch(current, {
      redirect: "manual",
      headers: { "user-agent": AUDIT_USER_AGENT, accept: "text/html,*/*" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) break;
      redirectChain.push(current);
      current = new URL(loc, current).toString();
      continue;
    }
    break;
  }
  if (!res) throw new Error("fetch failed");

  const ttfbMs = Date.now() - started;
  const headers: Record<string, string> = {};
  res.headers.forEach((v, k) => (headers[k] = v));
  const html = res.ok ? await res.text() : "";

  return {
    finalUrl: current,
    status: res.status,
    redirectChain,
    headers,
    https: current.startsWith("https://"),
    ttfbMs,
    html,
  };
}
