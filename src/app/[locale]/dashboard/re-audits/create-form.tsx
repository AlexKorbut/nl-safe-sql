"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/material/Card";
import { Button } from "@/components/material/Button";

export function ScheduleCreateForm() {
  const t = useTranslations("reaudits");
  const [siteUrl, setSiteUrl] = useState("");
  const [frequency, setFrequency] = useState<"weekly" | "biweekly" | "monthly">("weekly");
  const [alertThreshold, setAlertThreshold] = useState(5);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleCreate() {
    if (!siteUrl.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/audits/scheduled", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          siteUrl: siteUrl.trim(),
          frequency,
          alertThreshold,
        }),
      });

      if (res.ok) {
        setSuccess(true);
        setSiteUrl("");
        setFrequency("weekly");
        setAlertThreshold(5);
        setTimeout(() => setSuccess(false), 3000);
        // Trigger reload of schedules list
        window.dispatchEvent(new Event("schedules-updated"));
      }
    } catch (error) {
      console.error("Failed to create schedule:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-6 rounded-3xl border border-slate-800">
      <h3 className="text-lg font-medium mb-4">{t("addButton")}</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">{t("siteUrl")}</label>
          <input
            type="url"
            placeholder="https://example.com"
            value={siteUrl}
            onChange={(e) => setSiteUrl(e.target.value)}
            className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-indigo-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">{t("frequency")}</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as any)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-indigo-500"
            >
              <option value="weekly">{t("frequencyWeekly")}</option>
              <option value="biweekly">{t("frequencyBiweekly")}</option>
              <option value="monthly">{t("frequencyMonthly")}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              {t("alertThreshold")} ({alertThreshold})
            </label>
            <input
              type="range"
              min="1"
              max="50"
              value={alertThreshold}
              onChange={(e) => setAlertThreshold(Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>

        {success && (
          <div className="p-3 rounded-lg bg-green-900/30 border border-green-800 text-sm text-green-200">
            ✓ Scheduled audit created! It will run {frequency}.
          </div>
        )}

        <Button
          variant="filled"
          disabled={!siteUrl.trim() || loading}
          onClick={handleCreate}
        >
          {loading ? "Creating..." : t("addButton")}
        </Button>
      </div>
    </Card>
  );
}
