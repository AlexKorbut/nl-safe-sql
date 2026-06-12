import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/material/Card";
import { Button } from "@/components/material/Button";
import { Key, Copy, Trash2 } from "lucide-react";

export default async function ApiKeysPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/${locale}/auth/signin`);

  const t = await getTranslations("api");

  // TODO: Fetch user's API keys from DB
  const apiKeys: any[] = [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-12">
        <h1 className="text-3xl font-medium mb-2">{t("title")}</h1>
        <p className="text-[var(--on-surface-variant)]">{t("subtitle")}</p>
      </div>

      <div className="grid gap-6">
        {/* Create new key */}
        <Card elevated>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium mb-1">{t("createNew")}</h3>
              <p className="text-sm text-[var(--on-surface-variant)]">{t("createDesc")}</p>
            </div>
            <Button variant="filled">{t("generate")}</Button>
          </div>
        </Card>

        {/* API Keys list */}
        <div>
          <h3 className="text-lg font-medium mb-4">{t("active")}</h3>
          {apiKeys.length === 0 ? (
            <Card outlined className="text-center py-12">
              <Key className="mx-auto mb-3 w-8 h-8 text-[var(--outline)]" />
              <p className="text-[var(--on-surface-variant)]">{t("noKeys")}</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {apiKeys.map((key) => (
                <Card key={key.id} outlined>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{key.name}</p>
                      <p className="text-xs text-[var(--on-surface-variant)] mt-1">
                        {t("quota")}: {key.usedThisMonth} / {key.quotaPerMonth}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="text" size="small">
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button variant="text" size="small">
                        <Trash2 className="w-4 h-4 text-[var(--error)]" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Usage statistics */}
        <Card elevated>
          <h3 className="text-lg font-medium mb-6">{t("usage")}</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-medium text-[var(--primary)]">0</div>
              <p className="text-xs text-[var(--on-surface-variant)] mt-2">{t("totalRequests")}</p>
            </div>
            <div>
              <div className="text-2xl font-medium text-[var(--secondary)]">0%</div>
              <p className="text-xs text-[var(--on-surface-variant)] mt-2">{t("quotaUsed")}</p>
            </div>
            <div>
              <div className="text-2xl font-medium text-[var(--tertiary)]">0</div>
              <p className="text-xs text-[var(--on-surface-variant)] mt-2">{t("avgLatency")}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
