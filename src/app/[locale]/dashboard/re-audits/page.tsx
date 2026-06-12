import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/material/Card";
import { Button } from "@/components/material/Button";
import { Chip } from "@/components/material/Chip";
import { Clock, Zap, AlertCircle } from "lucide-react";

export default async function ReAuditsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/${locale}/auth/signin`);

  const t = await getTranslations("reaudits");

  // TODO: Fetch scheduled audits
  const scheduledAudits: any[] = [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-12">
        <h1 className="text-3xl font-medium mb-2">{t("title")}</h1>
        <p className="text-[var(--on-surface-variant)]">{t("subtitle")}</p>
      </div>

      <div className="grid gap-6">
        {/* Setup new schedule */}
        <Card elevated>
          <h3 className="text-lg font-medium mb-4">{t("setup")}</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">{t("selectSites")}</label>
              <div className="space-y-2">
                <Chip label="example.com" onDelete={() => {}} />
                <Chip label="+ Add more sites" variant="assist" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">{t("frequency")}</label>
              <div className="flex gap-2">
                {["Weekly", "Bi-weekly", "Monthly"].map((freq) => (
                  <Chip key={freq} label={freq} variant="filter" />
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">{t("alerts")}</label>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--primary-container)]">
                <input type="checkbox" className="w-5 h-5" defaultChecked />
                <span className="text-sm">{t("alertOnDrop", { pct: "5" })}</span>
              </div>
            </div>
            <Button variant="filled" className="w-full">
              {t("createSchedule")}
            </Button>
          </div>
        </Card>

        {/* Active schedules */}
        <div>
          <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            {t("active")}
          </h3>
          {scheduledAudits.length === 0 ? (
            <Card outlined className="text-center py-12">
              <Zap className="mx-auto mb-3 w-8 h-8 text-[var(--outline)]" />
              <p className="text-[var(--on-surface-variant)]">{t("noSchedules")}</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {scheduledAudits.map((schedule) => (
                <Card key={schedule.id} outlined>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{schedule.siteUrl}</p>
                      <div className="flex gap-2 mt-2">
                        <Chip label={schedule.frequency} />
                        {schedule.alertEnabled && <Chip label={`Alert: ${schedule.alertThreshold}%`} />}
                      </div>
                      <p className="text-xs text-[var(--on-surface-variant)] mt-2">
                        {t("nextRun")}: {new Date(schedule.nextRunAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button variant="text" size="small">
                      Edit
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Alert settings */}
        <Card elevated>
          <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {t("alertSettings")}
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-variant)]">
              <span className="text-sm">{t("emailOnAlert")}</span>
              <input type="checkbox" className="w-5 h-5" defaultChecked />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-variant)]">
              <span className="text-sm">{t("slackOnAlert")}</span>
              <input type="checkbox" className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
