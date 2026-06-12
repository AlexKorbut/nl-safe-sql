import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createCheckoutSession, getOrCreateCustomer } from "@/server/billing/stripe";
import { db, schema } from "@/server/db";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const { type, auditId } = body; // type: "report_unlock" | "subscription"

  if (!type) return NextResponse.json({ error: "missing type" }, { status: 400 });
  if (type === "report_unlock" && !auditId)
    return NextResponse.json({ error: "missing auditId" }, { status: 400 });

  const user = db.select().from(schema.users).where(eq(schema.users.id, session.user.id)).get();
  if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });

  const customer = await getOrCreateCustomer({
    userId: user.id,
    email: user.email ?? "",
    name: user.name ?? undefined,
  });

  const baseUrl = new URL(req.url).origin;
  const checkoutSession = await createCheckoutSession({
    customerId: customer.id,
    auditId,
    type,
    successUrl: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${baseUrl}/checkout/cancel`,
  });

  return NextResponse.json({ url: checkoutSession.url });
}
