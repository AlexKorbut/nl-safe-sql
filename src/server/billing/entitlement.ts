import { eq } from "drizzle-orm";
import { db, schema } from "@/server/db";
import { stripe } from "./stripe";
import type { Session } from "next-auth";

export async function getUserEntitlement(
  session: Session | null
): Promise<"free" | "full"> {
  if (!session?.user?.id) return "free";
  const user = db.select().from(schema.users).where(eq(schema.users.id, session.user.id)).get();
  if (!user) return "free";
  if (user.plan === "pro" && user.planExpiresAt && user.planExpiresAt > new Date())
    return "full";
  return "free";
}

export async function getAuditEntitlement(auditId: string, session: Session | null): Promise<"free" | "full"> {
  const audit = db.select().from(schema.audits).where(eq(schema.audits.id, auditId)).get();
  if (!audit) return "free";
  if (audit.unlocked) return "full";
  if (audit.userId) return getUserEntitlement(session);
  return "free";
}

export async function syncStripeCustomer(userId: string, stripeCustomerId: string) {
  db.update(schema.users)
    .set({ stripeCustomerId })
    .where(eq(schema.users.id, userId))
    .run();
}

export async function handleStripeWebhook(event: any) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      if (session.metadata?.type === "report_unlock" && session.metadata?.auditId) {
        db.update(schema.audits)
          .set({ unlocked: true })
          .where(eq(schema.audits.id, session.metadata.auditId))
          .run();
      }
      if (session.metadata?.type === "subscription" && session.customer) {
        const user = db
          .select()
          .from(schema.users)
          .where(eq(schema.users.stripeCustomerId, session.customer))
          .get();
        if (user) {
          const expiresAt = new Date();
          expiresAt.setMonth(expiresAt.getMonth() + 1);
          db.update(schema.users)
            .set({ plan: "pro", planExpiresAt: expiresAt })
            .where(eq(schema.users.id, user.id))
            .run();
        }
      }
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      const user = db
        .select()
        .from(schema.users)
        .where(eq(schema.users.stripeCustomerId, subscription.customer))
        .get();
      if (user) {
        db.update(schema.users)
          .set({ plan: "free", planExpiresAt: null })
          .where(eq(schema.users.id, user.id))
          .run();
      }
      break;
    }
  }
}
