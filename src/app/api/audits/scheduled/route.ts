import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db, schema } from "@/server/db";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { siteUrl, frequency, alertThreshold } = await req.json();

    if (!siteUrl || !frequency) {
      return NextResponse.json(
        { error: "siteUrl and frequency required" },
        { status: 400 }
      );
    }

    if (!["weekly", "biweekly", "monthly"].includes(frequency)) {
      return NextResponse.json(
        { error: "Invalid frequency" },
        { status: 400 }
      );
    }

    // Calculate next run time
    const now = new Date();
    const nextRun = new Date(now);
    const days = frequency === "weekly" ? 7 : frequency === "biweekly" ? 14 : 30;
    nextRun.setDate(nextRun.getDate() + days);

    const id = crypto.randomUUID();
    await db.insert(schema.scheduledAudits).values({
      id,
      userId: session.user.id,
      siteUrl,
      frequency: frequency as "weekly" | "biweekly" | "monthly",
      alertThreshold: alertThreshold || 5,
      nextRunAt: nextRun,
      enabled: true,
      createdAt: new Date(),
    });

    return NextResponse.json({
      ok: true,
      id,
      nextRunAt: nextRun,
    });
  } catch (error) {
    console.error("Scheduled audit creation error:", error);
    return NextResponse.json(
      { error: "Failed to create scheduled audit" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const schedules = await db
      .select()
      .from(schema.scheduledAudits)
      .where(eq(schema.scheduledAudits.userId, session.user.id));

    return NextResponse.json({ schedules });
  } catch (error) {
    console.error("Scheduled audits fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch schedules" },
      { status: 500 }
    );
  }
}
