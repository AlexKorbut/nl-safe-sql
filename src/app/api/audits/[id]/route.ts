import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/server/db";
import { serializeReport } from "@/server/report/serialize";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const audit = db.select().from(schema.audits).where(eq(schema.audits.id, id)).get();
  if (!audit) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (audit.status !== "done") {
    return NextResponse.json({
      id: audit.id,
      url: audit.normalizedUrl,
      status: audit.status,
      progress: audit.progressJson ? JSON.parse(audit.progressJson) : null,
      error: audit.error,
    });
  }

  // Entitlement is "free" until auth + billing ship; serializeReport
  // upgrades to "full" unless ENFORCE_FREE_TIER is on.
  const report = serializeReport(
    JSON.parse(audit.resultJson!),
    JSON.parse(audit.scoresJson!),
    audit.unlocked ? "full" : "free"
  );

  return NextResponse.json({
    id: audit.id,
    url: audit.normalizedUrl,
    status: audit.status,
    report,
  });
}
