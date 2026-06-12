import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/material/Card";
import { Button } from "@/components/material/Button";
import { Chip } from "@/components/material/Chip";
import { BarChart3, TrendingUp, Search } from "lucide-react";

export default async function GSCPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/${locale}/auth/signin`);

  const t = await getTranslations("gsc");

  // TODO: Fetch GSC connections and data
  const connections: any[] = [];
  const topQueries: any[] = [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-12">
        <h1 className="text-3xl font-medium mb-2">{t("title")}</h1>
        <p className="text-[var(--on-surface-variant)]">{t("subtitle")}</p>
      </div>

      <div className="grid gap-6">
        {/* Connect GSC */}
        <Card elevated>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium mb-1">{t("connect")}</h3>
              <p className="text-sm text-[var(--on-surface-variant)]">{t("connectDesc")}</p>
            </div>
            <Button variant="filled">{t("authorize")}</Button>
          </div>
        </Card>

        {/* Connected properties */}
        {connections.length > 0 && (
          <div>
            <h3 className="text-lg font-medium mb-4">{t("properties")}</h3>
            <div className="space-y-3">
              {connections.map((conn) => (
                <Card key={conn.id} outlined>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{conn.siteUrl}</p>
                      <p className="text-xs text-[var(--on-surface-variant)] mt-1">
                        {t("lastSync")}: {new Date(conn.lastSyncAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button variant="tonal" size="small">
                      {t("resync")}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Top queries */}
        {topQueries.length > 0 && (
          <Card elevated>
            <h3 className="text-lg font-medium mb-6 flex items-center gap-2">
              <Search className="w-5 h-5" />
              {t("topQueries")}
            </h3>
            <div className="space-y-3">
              {topQueries.slice(0, 5).map((q, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-variant)]">
                  <span className="text-sm font-medium">{q.query}</span>
                  <div className="flex gap-6 text-right text-xs">
                    <div>
                      <p className="text-[var(--on-surface-variant)]">Clicks</p>
                      <p className="font-medium text-[var(--primary)]">{q.clicks}</p>
                    </div>
                    <div>
                      <p className="text-[var(--on-surface-variant)]">CTR</p>
                      <p className="font-medium text-[var(--secondary)]">{(q.ctr * 100).toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {connections.length === 0 && (
          <Card outlined className="text-center py-12">
            <BarChart3 className="mx-auto mb-3 w-8 h-8 text-[var(--outline)]" />
            <p className="text-[var(--on-surface-variant)]">{t("noData")}</p>
          </Card>
        )}
      </div>
    </div>
  );
}
