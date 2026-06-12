// Final schema extensions for Wave 3 & 4 complete features

import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const scheduledAudits = sqliteTable("scheduled_audits", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  siteUrl: text("site_url").notNull(),
  frequency: text("frequency", { enum: ["weekly", "biweekly", "monthly"] }).notNull(),
  alertThreshold: integer("alert_threshold").notNull().default(5), // percentage drop
  lastScore: real("last_score"),
  nextRunAt: integer("next_run_at", { mode: "timestamp" }).notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const teamMembers = sqliteTable("team_members", {
  id: text("id").primaryKey(),
  teamId: text("team_id").notNull(),
  userId: text("user_id").notNull(),
  role: text("role", { enum: ["owner", "editor", "viewer"] }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const partnerApplications = sqliteTable("partner_applications", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  companyName: text("company_name").notNull(),
  email: text("email").notNull(),
  website: text("website"),
  status: text("status", { enum: ["pending", "approved", "rejected"] }).notNull().default("pending"),
  tier: text("tier", { enum: ["starter", "pro", "elite"] }),
  commissionRate: real("commission_rate"),
  referralCode: text("referral_code").unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const referrals = sqliteTable("referrals", {
  id: text("id").primaryKey(),
  partnerId: text("partner_id").notNull(),
  referredUserId: text("referred_user_id"),
  referredEmail: text("referred_email"),
  status: text("status", { enum: ["pending", "converted"] }).notNull().default("pending"),
  commissionEarned: real("commission_earned"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  convertedAt: integer("converted_at", { mode: "timestamp" }),
});
