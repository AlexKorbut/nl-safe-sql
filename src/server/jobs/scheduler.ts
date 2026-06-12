import cron from "node-cron";
import { eq, and, lt } from "drizzle-orm";
import { db, schema } from "@/server/db";
import { auditRunner } from "./runner";

/**
 * Scheduled re-audits (Wave 3):
 * Runs recurring audits based on user schedules.
 */

export interface ScheduledAudit {
  id: string;
  userId: string;
  siteUrl: string;
  frequency: "weekly" | "biweekly" | "monthly";
  alertThreshold: number;
  lastScore?: number;
  nextRunAt: Date;
  enabled: boolean;
}

export function startScheduler() {
  // Run every hour to check for due audits
  cron.schedule("0 * * * *", async () => {
    const now = new Date();
    const schedules = db
      .select()
      .from(schema.scheduledAudits)
      .where(and(eq(schema.scheduledAudits.enabled, true), lt(schema.scheduledAudits.nextRunAt, now)))
      .all();

    for (const schedule of schedules) {
      // Create audit
      const auditId = crypto.randomUUID();
      db.insert(schema.audits)
        .values({
          id: auditId,
          userId: schedule.userId,
          url: schedule.siteUrl,
          normalizedUrl: schedule.siteUrl,
          status: "queued",
        })
        .run();

      // Enqueue
      auditRunner.enqueue(auditId);

      // Update next run
      const interval =
        schedule.frequency === "weekly"
          ? 7
          : schedule.frequency === "biweekly"
            ? 14
            : 30;
      const nextRun = new Date();
      nextRun.setDate(nextRun.getDate() + interval);

      db.update(schema.scheduledAudits)
        .set({ nextRunAt: nextRun })
        .where(eq(schema.scheduledAudits.id, schedule.id))
        .run();
    }
  });

  console.log("✓ Scheduled audit monitor started");
}
