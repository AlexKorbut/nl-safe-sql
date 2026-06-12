import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/server/db";
import { validateApiToken } from "@/server/api/agency";
import { serializeReport } from "@/server/report/serialize";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "missing_auth" }, { status: 401 });
  }

  const token = auth.slice(7);
  const validation = await validateApiToken(token);
  if (!validation) {
    return NextResponse.json({ error: "invalid_token" }, { status: 403 });
  }

  const audit = db.select().from(schema.audits).where(eq(schema.audits.id, id)).get();
  if (!audit || audit.userId !== validation.userId) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (audit.status !== "done") {
    return NextResponse.json({
      id: audit.id,
      status: audit.status,
      progress: audit.progressJson ? JSON.parse(audit.progressJson) : null,
      error: audit.error,
    });
  }

  const report = serializeReport(
    JSON.parse(audit.resultJson!),
    JSON.parse(audit.scoresJson!),
    "full" // Agency tier always gets full access
  );

  return NextResponse.json({ id: audit.id, status: "done", report });
}
