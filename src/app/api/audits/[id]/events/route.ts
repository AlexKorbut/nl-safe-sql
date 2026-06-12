import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/server/db";
import { auditRunner, type AuditEvent } from "@/server/jobs/runner";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const audit = db.select().from(schema.audits).where(eq(schema.audits.id, id)).get();
  if (!audit) return new Response("not found", { status: 404 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (event: AuditEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      if (audit.status === "done" || audit.status === "failed") {
        send({
          step: audit.status,
          pct: 100,
          ...(audit.error && { error: audit.error }),
        });
        controller.close();
        return;
      }

      if (audit.progressJson) send(JSON.parse(audit.progressJson));

      const listener = (event: AuditEvent) => {
        send(event);
        if (event.step === "done" || event.step === "failed") {
          cleanup();
          controller.close();
        }
      };
      const cleanup = () => auditRunner.events.off(`audit:${id}`, listener);

      auditRunner.events.on(`audit:${id}`, listener);
      req.signal.addEventListener("abort", () => {
        cleanup();
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive",
    },
  });
}
