import { EventEmitter } from "node:events";
import { eq, inArray } from "drizzle-orm";
import { db, schema } from "@/server/db";
import { runAudit, SiteUnreachableError } from "@/server/audit/engine";
import { env } from "@/lib/env";
import type { ProgressStep } from "@/server/audit/types";

export interface AuditEvent {
  step: ProgressStep | "done" | "failed";
  pct: number;
  error?: string;
}

const AUDIT_TIMEOUT_MS = 120000;

class AuditRunner {
  readonly events = new EventEmitter();
  private queue: string[] = [];
  private active = 0;

  constructor() {
    this.events.setMaxListeners(100);
    this.recoverStuck();
  }

  /** Re-queues audits left queued/running by a previous process. */
  private recoverStuck() {
    try {
      const stuck = db
        .select({ id: schema.audits.id })
        .from(schema.audits)
        .where(inArray(schema.audits.status, ["queued", "running"]))
        .all();
      for (const row of stuck) this.enqueue(row.id);
    } catch (error) {
      // Table may not exist during build; ignore
    }
  }

  enqueue(auditId: string) {
    if (!this.queue.includes(auditId)) this.queue.push(auditId);
    queueMicrotask(() => this.pump());
  }

  private pump() {
    while (this.active < env.AUDIT_CONCURRENCY && this.queue.length > 0) {
      const id = this.queue.shift()!;
      this.active++;
      this.process(id).finally(() => {
        this.active--;
        this.pump();
      });
    }
  }

  private emit(auditId: string, event: AuditEvent) {
    db.update(schema.audits)
      .set({ progressJson: JSON.stringify(event) })
      .where(eq(schema.audits.id, auditId))
      .run();
    this.events.emit(`audit:${auditId}`, event);
  }

  private async process(auditId: string) {
    const audit = db.select().from(schema.audits).where(eq(schema.audits.id, auditId)).get();
    if (!audit || audit.status === "done" || audit.status === "failed") return;

    db.update(schema.audits)
      .set({ status: "running" })
      .where(eq(schema.audits.id, auditId))
      .run();

    try {
      const report = await Promise.race([
        runAudit(audit.normalizedUrl, {
          onProgress: (step, pct) => this.emit(auditId, { step, pct }),
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("audit timeout")), AUDIT_TIMEOUT_MS)
        ),
      ]);

      db.update(schema.audits)
        .set({
          status: "done",
          resultJson: JSON.stringify(report.checks),
          scoresJson: JSON.stringify(report.scores),
          finishedAt: new Date(),
        })
        .where(eq(schema.audits.id, auditId))
        .run();
      this.emit(auditId, { step: "done", pct: 100 });
    } catch (err) {
      const reason =
        err instanceof SiteUnreachableError ? err.reason : "internal";
      db.update(schema.audits)
        .set({ status: "failed", error: reason, finishedAt: new Date() })
        .where(eq(schema.audits.id, auditId))
        .run();
      this.emit(auditId, { step: "failed", pct: 100, error: reason });
    }
  }
}

// Module-level singleton; survives across route handler invocations in a
// single-process deployment. globalThis guard survives Next.js dev HMR.
const globalForRunner = globalThis as unknown as { auditRunner?: AuditRunner };
export const auditRunner = (globalForRunner.auditRunner ??= new AuditRunner());
