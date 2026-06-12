const PRIVATE_HOST_RE =
  /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.|169\.254\.|\[?::1\]?$)/i;

/**
 * Normalizes user input into an absolute http(s) URL.
 * Returns null for invalid input or private/loopback hosts (SSRF guard).
 */
export function normalizeUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (!url.hostname.includes(".") || PRIVATE_HOST_RE.test(url.hostname)) return null;
  url.hash = "";
  return url.toString();
}

export function isInternalLink(href: string, baseUrl: string): boolean {
  try {
    return new URL(href, baseUrl).hostname === new URL(baseUrl).hostname;
  } catch {
    return false;
  }
}
