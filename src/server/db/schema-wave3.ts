// Schema extensions for Wave 3
// Run: npm run db:migrate

import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core";

export const apiTokens = sqliteTable("api_tokens", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  token: text("token").notNull().unique(), // sha256 hash
  name: text("name").notNull(),
  quotaPerMonth: integer("quota_per_month").notNull().default(200),
  usedThisMonth: integer("used_this_month").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  lastUsedAt: integer("last_used_at", { mode: "timestamp" }),
});

export const gscConnections = sqliteTable("gsc_connections", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  siteUrl: text("site_url").notNull(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  expiresAt: integer("expires_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const crawlResults = sqliteTable("crawl_results", {
  id: text("id").primaryKey(),
  auditId: text("audit_id").notNull(),
  url: text("url").notNull(),
  status: integer("status").notNull(),
  title: text("title"),
  h1: text("h1"),
  wordCount: integer("word_count").notNull(),
  scoresJson: text("scores_json"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const aiSuggestions = sqliteTable("ai_suggestions", {
  id: text("id").primaryKey(),
  auditId: text("audit_id").notNull(),
  checkId: text("check_id").notNull(),
  type: text("type", { enum: ["json-ld", "title", "description", "content", "html-patch"] }).notNull(),
  before: text("before"),
  after: text("after").notNull(),
  reason: text("reason").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const slackIntegrations = sqliteTable("slack_integrations", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  workspaceId: text("workspace_id").notNull(),
  slackUserId: text("slack_user_id").notNull(),
  accessToken: text("access_token").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
