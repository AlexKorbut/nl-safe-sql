import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { db, schema } from "@/server/db";
import { auditRunner } from "@/server/jobs/runner";
import { validateApiToken } from "@/server/api/agency";
import { normalizeUrl } from "@/lib/url";

/**
 * Agency API (Wave 3): programmatic audit creation
 * Authorization: Bearer <API_TOKEN>
 */

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "missing_auth" }, { status: 401 });
  }

  const token = auth.slice(7);
  const validation = await validateApiToken(token);
  if (!validation) {
    return NextResponse.json({ error: "invalid_token_or_quota_exceeded" }, { status: 403 });
  }

  const body = await req.json();
  const normalized = normalizeUrl(body.url ?? "");
  if (!normalized) {
    return NextResponse.json({ error: "invalid_url" }, { status: 400 });
  }

  const id = randomUUID();
  db.insert(schema.audits)
    .values({ id, url: body.url!, normalizedUrl: normalized, status: "queued", userId: validation.userId })
    .run();
  auditRunner.enqueue(id);

  return NextResponse.json({ id, status: "queued" }, { status: 201 });
}
