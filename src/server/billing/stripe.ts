import Stripe from "stripe";
import { env } from "@/lib/env";

if (!env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is required");
}

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
  typescript: true,
});

export async function createCheckoutSession(args: {
  customerId?: string;
  auditId?: string;
  type: "report_unlock" | "subscription";
  successUrl: string;
  cancelUrl: string;
}) {
  const { customerId, auditId, type, successUrl, cancelUrl } = args;

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
    type === "report_unlock"
      ? [{ price: env.STRIPE_PRICE_REPORT_UNLOCK, quantity: 1 }]
      : [{ price: env.STRIPE_PRICE_PRO_MONTHLY, quantity: 1 }];

  const metadata: Record<string, string> = { type };
  if (auditId) metadata.auditId = auditId;

  return stripe.checkout.sessions.create({
    mode: type === "report_unlock" ? "payment" : "subscription",
    customer: customerId,
    line_items: lineItems,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata,
  });
}

export async function getOrCreateCustomer(args: {
  userId: string;
  email: string;
  name?: string;
}) {
  const { userId, email, name } = args;

  const customers = await stripe.customers.list({
    email,
    limit: 1,
  });

  if (customers.data.length > 0) {
    return customers.data[0];
  }

  return stripe.customers.create({
    email,
    name: name ?? undefined,
    metadata: { userId },
  });
}
