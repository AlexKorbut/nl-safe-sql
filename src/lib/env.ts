import { z } from "zod";

const schema = z.object({
  DATABASE_PATH: z.string().default("./data/app.db"),
  PSI_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  AUDIT_CONCURRENCY: z.coerce.number().int().min(1).max(10).default(2),
  FREE_AUDITS_PER_DAY: z.coerce.number().int().min(0).default(3),
  ENFORCE_FREE_TIER: z.string().default("false").transform((v) => v === "true"),
  // Auth.js
  NEXTAUTH_SECRET: z.string().optional(),
  NEXTAUTH_URL: z.string().optional(),
  // Email (Resend)
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().optional(),
  // OAuth (Google)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  // Stripe
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_REPORT_UNLOCK: z.string().optional(),
  STRIPE_PRICE_PRO_MONTHLY: z.string().optional(),
});

export const env = schema.parse(process.env);
