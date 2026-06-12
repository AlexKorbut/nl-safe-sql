"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/material/Card";
import { Chip } from "@/components/material/Chip";

interface Schedule {
  id: string;
  siteUrl: string;
  frequency: "weekly" | "biweekly" | "monthly";
  alertThreshold: number;
  nextRunAt: string;
  enabled: boolean;
}

export function SchedulesList() {
  const t = useTranslations("reaudits");
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSchedules();

    // Listen for updates from create form
    window.addEventListener("schedules-updated", loadSchedules);
    return () => window.removeEventListener("schedules-updated", loadSchedules);
  }, []);

  async function loadSchedules() {
    try {
      const res = await fetch("/api/audits/scheduled");
      if (res.ok) {
        const data = await res.json();
        setSchedules(data.schedules || []);
      }
    } catch (error) {
      console.error("Failed to load schedules:", error);
    } finally {
      setLoading(false);
    }
  }

  const frequencyLabels = {
    weekly: t("frequencyWeekly"),
    biweekly: t("frequencyBiweekly"),
    monthly: t("frequencyMonthly"),
  };

  if (loading) {
    return (
      <Card className="p-6 rounded-3xl border border-slate-800 text-center">
        <p className="text-slate-400">Loading...</p>
      </Card>
    );
  }

  if (schedules.length === 0) {
    return (
      <Card className="p-12 rounded-3xl border border-slate-800 text-center">
        <p className="text-slate-400">{t("noSchedules")}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {schedules.map((schedule) => (
        <Card
          key={schedule.id}
          className="p-4 rounded-2xl border border-slate-800 hover:border-slate-700"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="font-medium text-slate-100">{schedule.siteUrl}</p>
              <div className="flex gap-2 mt-2 flex-wrap">
                <Chip label={frequencyLabels[schedule.frequency]} />
                <Chip label={`${t("alertThreshold")}: ${schedule.alertThreshold}%`} />
              </div>
              <p className="text-xs text-slate-400 mt-2">
                {t("nextRun")}: {new Date(schedule.nextRunAt).toLocaleDateString()}
              </p>
              {!schedule.enabled && (
                <p className="text-xs text-amber-400 mt-1">Disabled</p>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
