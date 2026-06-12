import { env } from "@/lib/env";
import type { NamedCheckResult } from "@/server/audit/types";

/**
 * AI-generated fixes: generates ready-to-use patches for failing checks.
 * Returns structured suggestions (JSON-LD, title rewrites, etc.).
 */

export interface FixSuggestion {
  checkId: string;
  type: "json-ld" | "title" | "description" | "content" | "html-patch";
  before?: string;
  after: string;
  reason: string;
}

export async function generateFixes(
  checks: NamedCheckResult[],
  context: { title?: string; h1?: string; mainText: string }
): Promise<FixSuggestion[]> {
  if (!env.OPENAI_API_KEY) return [];

  const failedChecks = checks.filter((c) => c.status === "fail");
  if (failedChecks.length === 0) return [];

  const prompt = `Generate ready-to-use fixes for these failing checks:
${failedChecks.map((c) => `- ${c.id}: ${c.status}`).join("\n")}

Current title: ${context.title}
Current H1: ${context.h1}
Text length: ${context.mainText.split(/\s+/).length} words

Return JSON array with fixes like:
[
  { "checkId": "title-tag", "type": "title", "before": "old", "after": "new", "reason": "..." },
  { "checkId": "jsonld-org", "type": "json-ld", "after": "{\\"@context\\"...", "reason": "..." }
]`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: env.OPENAI_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) return [];

    const json = JSON.parse(text);
    return Array.isArray(json) ? json : [];
  } catch {
    return [];
  }
}
