import { createHash } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/server/db";
import { env } from "@/lib/env";

/** Returns true if the anonymous caller may run another audit today. */
export function checkAndCountRateLimit(ip: string): boolean {
  const ipHash = createHash("sha256").update(ip).digest("hex").slice(0, 32);
  const day = new Date().toISOString().slice(0, 10);

  const row = db
    .select()
    .from(schema.rateLimits)
    .where(and(eq(schema.rateLimits.ipHash, ipHash), eq(schema.rateLimits.day, day)))
    .get();

  if (!row) {
    db.insert(schema.rateLimits).values({ ipHash, day, count: 1 }).run();
    return true;
  }
  if (row.count >= env.FREE_AUDITS_PER_DAY) return false;
  db.update(schema.rateLimits)
    .set({ count: sql`${schema.rateLimits.count} + 1` })
    .where(and(eq(schema.rateLimits.ipHash, ipHash), eq(schema.rateLimits.day, day)))
    .run();
  return true;
}
