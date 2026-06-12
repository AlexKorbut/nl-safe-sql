import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/material/Card";
import { Users, Shield } from "lucide-react";

export default async function TeamPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/${locale}/auth/signin`);

  const t = await getTranslations("team");

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-12">
        <h1 className="text-3xl font-medium mb-2 flex items-center gap-2">
          <Users className="w-8 h-8" />
          {t("title")}
        </h1>
        <p className="text-slate-400">{t("subtitle")}</p>
      </div>

      <div className="grid gap-6">
        {/* Current user */}
        <Card className="p-6 rounded-3xl border border-slate-800">
          <h3 className="text-lg font-medium mb-4">Your Account</h3>
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-900">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
                  <span className="text-white font-semibold">
                    {session.user.email?.[0].toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-medium">{session.user.email}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Shield className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs text-indigo-400">Owner (Full access)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Coming soon */}
        <Card className="p-6 rounded-3xl border border-slate-800">
          <h3 className="text-lg font-medium mb-3">Team Features (Coming Soon)</h3>
          <div className="space-y-2 text-sm text-slate-400">
            <p>✓ Invite team members (Editor, Viewer roles)</p>
            <p>✓ Manage team permissions</p>
            <p>✓ Audit history and reports (shared team view)</p>
            <p>✓ API key management for teams</p>
          </div>
          <p className="mt-4 text-xs text-slate-500">
            Team management is available on paid Pro and Agency plans. Upgrade to enable team features.
          </p>
        </Card>

        {/* Info */}
        <Card className="p-6 rounded-3xl border border-slate-800">
          <h3 className="text-lg font-medium mb-3">Role Permissions</h3>
          <div className="space-y-3 text-sm">
            <div>
              <p className="font-medium">Owner</p>
              <p className="text-slate-400">Full access: create audits, manage team, control billing</p>
            </div>
            <div>
              <p className="font-medium">Editor</p>
              <p className="text-slate-400">Run audits, view reports, manage scheduled audits</p>
            </div>
            <div>
              <p className="font-medium">Viewer</p>
              <p className="text-slate-400">View-only access to reports and audit history</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
