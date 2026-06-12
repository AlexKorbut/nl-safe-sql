import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";
import type { ExtractedPage } from "../types";
import { isInternalLink } from "@/lib/url";

const NON_CONTENT = "script, style, nav, header, footer, aside, noscript, svg";

export function parseHtml(html: string, baseUrl: string): { $: CheerioAPI; extracted: ExtractedPage } {
  const $ = cheerio.load(html);

  const headings = $("h1, h2, h3, h4, h5, h6")
    .map((_, el) => ({
      level: Number(el.tagName.slice(1)),
      text: $(el).text().trim(),
    }))
    .get()
    .filter((h) => h.text.length > 0);

  const $content = cheerio.load(html);
  $content(NON_CONTENT).remove();
  const mainRoot = $content("main, article, [role=main]").first();
  const mainText = (mainRoot.length ? mainRoot : $content("body"))
    .text()
    .replace(/\s+/g, " ")
    .trim();

  const links = $("a[href]")
    .map((_, el) => {
      const href = $(el).attr("href") ?? "";
      return { href, text: $(el).text().trim(), internal: isInternalLink(href, baseUrl) };
    })
    .get()
    .filter((l) => l.href && !l.href.startsWith("#") && !l.href.startsWith("javascript:"));

  const jsonLd: Record<string, unknown>[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const parsed = JSON.parse($(el).text());
      for (const node of Array.isArray(parsed) ? parsed : [parsed]) {
        if (node && typeof node === "object") jsonLd.push(node as Record<string, unknown>);
      }
    } catch {
      jsonLd.push({ __parseError: true });
    }
  });

  const ogTags: Record<string, string> = {};
  $('meta[property^="og:"], meta[name^="twitter:"]').each((_, el) => {
    const key = $(el).attr("property") ?? $(el).attr("name");
    const content = $(el).attr("content");
    if (key && content) ogTags[key] = content;
  });

  const extracted: ExtractedPage = {
    title: $("title").first().text().trim() || undefined,
    metaDescription: $('meta[name="description"]').attr("content")?.trim() || undefined,
    h1s: $("h1").map((_, el) => $(el).text().trim()).get(),
    headings,
    mainText,
    wordCount: mainText ? mainText.split(/\s+/).length : 0,
    links,
    images: $("img")
      .map((_, el) => ({ src: $(el).attr("src") ?? "", alt: $(el).attr("alt") }))
      .get()
      .filter((i) => i.src),
    jsonLd,
    ogTags,
    canonical: $('link[rel="canonical"]').attr("href")?.trim() || undefined,
    metaRobots: $('meta[name="robots"]').attr("content")?.trim() || undefined,
    lang: $("html").attr("lang")?.trim() || undefined,
    viewport: $('meta[name="viewport"]').attr("content")?.trim() || undefined,
    hasForm: $("form").length > 0,
    hasTelLink: $('a[href^="tel:"]').length > 0,
    metaRefresh: $('meta[http-equiv="refresh" i]').attr("content")?.trim() || undefined,
  };

  return { $, extracted };
}
