import { env } from "@/lib/env";
import type { ExtractedPage, LlmAssessment } from "../types";

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["eeat", "helpfulness", "citability", "clarity", "adsRelevance"],
  properties: {
    eeat: subSchema(),
    helpfulness: subSchema(),
    citability: subSchema(),
    clarity: subSchema(),
    adsRelevance: {
      type: "object",
      additionalProperties: false,
      required: ["score", "misleadingFlags"],
      properties: {
        score: { type: "integer", minimum: 0, maximum: 100 },
        misleadingFlags: { type: "array", items: { type: "string" } },
      },
    },
  },
} as const;

function subSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["score", "reasons"],
    properties: {
      score: { type: "integer", minimum: 0, maximum: 100 },
      reasons: { type: "array", items: { type: "string" } },
    },
  } as const;
}

/**
 * Single batched LLM call assessing E-E-A-T, helpfulness, AI-citability,
 * structure clarity, and ads landing relevance. Returns null when no API key
 * is configured or the call fails — the pipeline degrades gracefully.
 */
export async function collectLlmAssessment(
  extracted: ExtractedPage,
  locale: string
): Promise<LlmAssessment | null> {
  if (!env.OPENAI_API_KEY) return null;

  const input = [
    `TITLE: ${extracted.title ?? "(none)"}`,
    `META DESCRIPTION: ${extracted.metaDescription ?? "(none)"}`,
    `HEADINGS: ${extracted.headings.map((h) => `H${h.level}: ${h.text}`).join(" | ")}`,
    `MAIN TEXT (truncated): ${extracted.mainText.split(/\s+/).slice(0, 4000).join(" ")}`,
  ].join("\n\n");

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: env.OPENAI_MODEL,
        response_format: {
          type: "json_schema",
          json_schema: { name: "page_assessment", strict: true, schema: RESPONSE_SCHEMA },
        },
        messages: [
          {
            role: "system",
            content:
              "You are an expert auditor of web pages for Google's modern ranking systems (E-E-A-T, Helpful Content, AI Overviews citability) and Google Ads landing page quality. " +
              "Score each dimension 0-100 and give 1-3 short reasons per dimension. " +
              `Write reasons in locale "${locale}". ` +
              "adsRelevance: does the above-fold promise match the content; list misleading-content markers (fake urgency, unverifiable claims, 'guaranteed results') as misleadingFlags.",
          },
          { role: "user", content: input },
        ],
      }),
      signal: AbortSignal.timeout(45000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;
    return JSON.parse(content) as LlmAssessment;
  } catch {
    return null;
  }
}
