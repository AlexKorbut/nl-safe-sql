import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  locale: text("locale").notNull().default("en"),
  stripeCustomerId: text("stripe_customer_id"),
  plan: text("plan", { enum: ["free", "pro"] }).notNull().default("free"),
  planExpiresAt: integer("plan_expires_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const audits = sqliteTable("audits", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  url: text("url").notNull(),
  normalizedUrl: text("normalized_url").notNull(),
  status: text("status", { enum: ["queued", "running", "done", "failed"] })
    .notNull()
    .default("queued"),
  progressJson: text("progress_json"),
  resultJson: text("result_json"),
  scoresJson: text("scores_json"),
  error: text("error"),
  unlocked: integer("unlocked", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  finishedAt: integer("finished_at", { mode: "timestamp" }),
});

export const purchases = sqliteTable("purchases", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  auditId: text("audit_id"),
  stripeSessionId: text("stripe_session_id").notNull(),
  type: text("type", { enum: ["report_unlock", "subscription"] }).notNull(),
  amount: integer("amount").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const rateLimits = sqliteTable("rate_limits", {
  ipHash: text("ip_hash").notNull(),
  day: text("day").notNull(),
  count: integer("count").notNull().default(0),
});
