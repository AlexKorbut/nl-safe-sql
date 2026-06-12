import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, schema } from "@/server/db";

/**
 * Agency-tier API tokens for programmatic access.
 * One token per user, used for API auth.
 */

export interface ApiToken {
  id: string;
  userId: string;
  token: string; // hashed with sha256
  name: string;
  quotaPerMonth: number;
  usedThisMonth: number;
  createdAt: Date;
  lastUsedAt?: Date;
}

export async function createApiToken(userId: string, name: string, quotaPerMonth = 200): Promise<string> {
  const token = randomUUID();
  const tokenHash = await hash(token);

  db.insert(schema.apiTokens).values({
    id: randomUUID(),
    userId,
    token: tokenHash,
    name,
    quotaPerMonth,
    usedThisMonth: 0,
    createdAt: new Date(),
  }).run();

  return token;
}

export async function validateApiToken(token: string): Promise<{ userId: string; quota: number } | null> {
  const tokenHash = await hash(token);
  const row = db
    .select()
    .from(schema.apiTokens)
    .where(eq(schema.apiTokens.token, tokenHash))
    .get();

  if (!row || row.usedThisMonth >= row.quotaPerMonth) return null;
  return { userId: row.userId, quota: row.quotaPerMonth - row.usedThisMonth };
}

async function hash(token: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
