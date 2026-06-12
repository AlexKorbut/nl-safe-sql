import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/material/Card";
import { Clock, Zap } from "lucide-react";
import { ScheduleCreateForm } from "./create-form";
import { SchedulesList } from "./list";

export default async function ReAuditsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/${locale}/auth/signin`);

  const t = await getTranslations("reaudits");

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-12">
        <h1 className="text-3xl font-medium mb-2">{t("title")}</h1>
        <p className="text-slate-400">{t("subtitle")}</p>
      </div>

      <div className="grid gap-6">
        {/* Create new schedule */}
        <ScheduleCreateForm />

        {/* Active schedules */}
        <div>
          <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            {t("schedules")}
          </h3>
          <SchedulesList />
        </div>

        {/* Info card */}
        <Card className="p-6 rounded-3xl border border-slate-800">
          <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
            <Zap className="w-5 h-5" />
            How it works
          </h3>
          <ul className="space-y-2 text-sm text-slate-400">
            <li>• Scheduled audits run automatically at your chosen frequency</li>
            <li>• Alerts notify you when site scores drop below your threshold</li>
            <li>• Reports are saved in your audit history for comparison</li>
            <li>• You control alert settings (email, Slack webhooks)</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
