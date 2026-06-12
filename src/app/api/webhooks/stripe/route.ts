import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/server/billing/stripe";
import { handleStripeWebhook } from "@/server/billing/entitlement";
import { env } from "@/lib/env";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) return NextResponse.json({ error: "no signature" }, { status: 400 });

  try {
    const event = stripe.webhooks.constructEvent(body, sig, env.STRIPE_WEBHOOK_SECRET!);
    await handleStripeWebhook(event);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: "webhook error" }, { status: 400 });
  }
}
