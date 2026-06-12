"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

interface ProgressEvent {
  step: string;
  pct: number;
  error?: string;
}

export function AuditProgress({ auditId }: { auditId: string }) {
  const t = useTranslations("audit");
  const router = useRouter();
  const [event, setEvent] = useState<ProgressEvent>({ step: "fetching", pct: 0 });
  const finished = useRef(false);

  useEffect(() => {
    const handle = (e: ProgressEvent) => {
      if (finished.current) return;
      setEvent(e);
      if (e.step === "done") {
        finished.current = true;
        router.replace(`/report/${auditId}`);
      } else if (e.step === "failed") {
        finished.current = true;
      }
    };

    const es = new EventSource(`/api/audits/${auditId}/events`);
    es.onmessage = (msg) => handle(JSON.parse(msg.data));

    // Polling fallback if SSE drops
    const poll = setInterval(async () => {
      if (finished.current) return;
      try {
        const res = await fetch(`/api/audits/${auditId}`);
        const data = await res.json();
        if (data.status === "done") handle({ step: "done", pct: 100 });
        if (data.status === "failed") handle({ step: "failed", pct: 100, error: data.error });
      } catch {}
    }, 3000);

    return () => {
      es.close();
      clearInterval(poll);
    };
  }, [auditId, router]);

  if (event.step === "failed") {
    const reason = ["unreachable", "blocked", "non_html"].includes(event.error ?? "")
      ? event.error
      : "internal";
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold text-red-400">{t("failedTitle")}</h1>
        <p className="mt-3 text-slate-400">{t(`failedReasons.${reason}`)}</p>
      </div>
    );
  }

  return (
    <div className="text-center">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="mt-3 text-slate-400">{t(`steps.${event.step}`)}</p>
      <div className="mt-8 h-2 w-full overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full bg-indigo-500 transition-all duration-700"
          style={{ width: `${event.pct}%` }}
        />
      </div>
      <p className="mt-2 text-sm text-slate-500">{event.pct}%</p>
    </div>
  );
}
