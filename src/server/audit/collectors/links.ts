import { AUDIT_USER_AGENT } from "./fetchPage";
import type { ExtractedPage } from "../types";

/** HEAD-checks a sample of internal links; only definite errors (4xx/5xx) are reported. */
export async function collectBrokenLinks(
  links: ExtractedPage["links"],
  baseUrl: string,
  sampleSize = 10
): Promise<{ url: string; status: number }[]> {
  const internal = [
    ...new Set(
      links
        .filter((l) => l.internal)
        .map((l) => {
          try {
            return new URL(l.href, baseUrl).toString();
          } catch {
            return null;
          }
        })
        .filter((u): u is string => u !== null)
    ),
  ].slice(0, sampleSize);

  const results = await Promise.allSettled(
    internal.map(async (url) => {
      const res = await fetch(url, {
        method: "HEAD",
        headers: { "user-agent": AUDIT_USER_AGENT },
        signal: AbortSignal.timeout(8000),
      });
      return { url, status: res.status };
    })
  );

  return results
    .filter((r): r is PromiseFulfilledResult<{ url: string; status: number }> => r.status === "fulfilled")
    .map((r) => r.value)
    .filter((r) => r.status >= 400);
}
