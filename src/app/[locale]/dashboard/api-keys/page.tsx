import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/material/Card";
import { Key } from "lucide-react";
import { ApiKeyCreateForm } from "./create-form";
import { ApiKeysList } from "./list";

export default async function ApiKeysPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/${locale}/auth/signin`);

  const t = await getTranslations("api");

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-12">
        <h1 className="text-3xl font-medium mb-2">{t("title")}</h1>
        <p className="text-slate-400">{t("subtitle")}</p>
      </div>

      <div className="grid gap-6">
        {/* Create new key form */}
        <ApiKeyCreateForm />

        {/* API Keys list */}
        <div>
          <h3 className="text-lg font-medium mb-4">Your API Keys</h3>
          <ApiKeysList />
        </div>

        {/* Usage statistics */}
        <Card className="p-6 rounded-3xl border border-slate-800">
          <h3 className="text-lg font-medium mb-6">Usage this month</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-medium text-indigo-600">0</div>
              <p className="text-xs text-slate-400 mt-2">Total requests</p>
            </div>
            <div>
              <div className="text-2xl font-medium text-slate-300">0%</div>
              <p className="text-xs text-slate-400 mt-2">Quota used</p>
            </div>
            <div>
              <div className="text-2xl font-medium text-slate-300">0 ms</div>
              <p className="text-xs text-slate-400 mt-2">Avg latency</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
