import { db } from "@/server/db";
import { audits } from "@/server/db/schema";

export const runtime = "nodejs";

export async function GET() {
  try {
    // Test database connection
    const result = await db.select().from(audits).limit(1);

    return Response.json(
      {
        status: "healthy",
        timestamp: new Date().toISOString(),
        version: "0.1.0",
        checks: {
          database: "ok",
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return Response.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
        checks: {
          database: "failed",
        },
      },
      { status: 503 }
    );
  }
}
