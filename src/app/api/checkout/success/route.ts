import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { stripe } from "@/server/billing/stripe";
import { db, schema } from "@/server/db";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.redirect(new URL("/auth/signin", req.url));

  const sessionId = req.nextUrl.searchParams.get("session_id");
  if (!sessionId) return NextResponse.redirect(new URL("/", req.url));

  const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);
  if (checkoutSession.payment_status !== "paid")
    return NextResponse.redirect(new URL("/checkout/cancel", req.url));

  // Webhook should have handled this, but double-check
  if (checkoutSession.metadata?.type === "report_unlock" && checkoutSession.metadata?.auditId) {
    db.update(schema.audits)
      .set({ unlocked: true })
      .where(eq(schema.audits.id, checkoutSession.metadata.auditId))
      .run();
    return NextResponse.redirect(new URL(`/report/${checkoutSession.metadata.auditId}`, req.url));
  }

  return NextResponse.redirect(new URL("/dashboard", req.url));
}
