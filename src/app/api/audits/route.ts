import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { db, schema } from "@/server/db";
import { auditRunner } from "@/server/jobs/runner";
import { checkAndCountRateLimit } from "@/server/rate-limit";
import { normalizeUrl } from "@/lib/url";

export async function POST(req: NextRequest) {
  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const normalized = normalizeUrl(body.url ?? "");
  if (!normalized) {
    return NextResponse.json({ error: "invalid_url" }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkAndCountRateLimit(ip)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const id = randomUUID();
  db.insert(schema.audits)
    .values({ id, url: body.url!, normalizedUrl: normalized, status: "queued" })
    .run();
  auditRunner.enqueue(id);

  return NextResponse.json({ id }, { status: 201 });
}
