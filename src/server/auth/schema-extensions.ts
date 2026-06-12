import { text, integer } from "drizzle-orm/sqlite-core";
import { accountsTable, sessionsTable, usersTable, verificationTokensTable } from "@auth/drizzle-orm";
import { db } from "@/server/db";

// Update users table to include Stripe fields
db.execute(`
  ALTER TABLE users ADD COLUMN stripe_customer_id TEXT UNIQUE;
  ALTER TABLE users ADD COLUMN plan TEXT DEFAULT 'free' CHECK(plan IN ('free', 'pro'));
  ALTER TABLE users ADD COLUMN plan_expires_at INTEGER;
`).catch(() => {
  // Table already updated, ignore error
});
