import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db, schema } from "@/server/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name } = await req.json();
    if (!name) {
      return NextResponse.json(
        { error: "Token name required" },
        { status: 400 }
      );
    }

    // Generate token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);

    // Store token hash in DB
    await db.insert(schema.apiTokens).values({
      id: crypto.randomUUID(),
      userId: session.user.id,
      token: tokenHash,
      name,
      quotaPerMonth: 200,
      usedThisMonth: 0,
      createdAt: new Date(),
    });

    return NextResponse.json({
      ok: true,
      token: rawToken,
      message: "Copy this token now. You won't see it again!",
    });
  } catch (error) {
    console.error("Token creation error:", error);
    return NextResponse.json(
      { error: "Failed to create token" },
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

    const tokens = await db
      .select({
        id: schema.apiTokens.id,
        name: schema.apiTokens.name,
        createdAt: schema.apiTokens.createdAt,
        quotaPerMonth: schema.apiTokens.quotaPerMonth,
        usedThisMonth: schema.apiTokens.usedThisMonth,
      })
      .from(schema.apiTokens)
      .where(eq(schema.apiTokens.userId, session.user.id));

    return NextResponse.json({ tokens });
  } catch (error) {
    console.error("Token list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tokens" },
      { status: 500 }
    );
  }
}
