import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getTranslations } from "next-intl/server";
import { db, schema } from "@/server/db";
import { eq } from "drizzle-orm";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { CheckoutButton } from "@/components/billing/CheckoutButton";
import { Link } from "@/i18n/navigation";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/${locale}/auth/signin`);

  const user = db.select().from(schema.users).where(eq(schema.users.id, session.user.id)).get();
  const audits = db.select().from(schema.audits).where(eq(schema.audits.userId, session.user.id)).all();

  const t = await getTranslations("dashboard");

  const isPro = user?.plan === "pro" && user?.planExpiresAt && user.planExpiresAt > new Date();

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("welcome", { name: user?.name ?? session.user.email })}</h1>
          <p className="mt-2 text-slate-400">{t("subtitle")}</p>
        </div>
        <SignOutButton />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-6">
          <p className="text-sm text-slate-400">{t("currentPlan")}</p>
          <p className="mt-2 text-xl font-semibold">
            {isPro ? t("planPro") : t("planFree")}
          </p>
          {isPro && (
            <p className="mt-1 text-xs text-slate-500">
              {t("expiresAt", { date: user!.planExpiresAt!.toLocaleDateString() })}
            </p>
          )}
        </div>
        {!isPro && (
          <CheckoutButton type="subscription" className="rounded-lg border border-indigo-700 bg-indigo-950/40 p-6">
            <p className="text-sm text-indigo-400">{t("upgradeTitle")}</p>
            <p className="mt-2 text-xl font-semibold">{t("upgradeCTA")}</p>
          </CheckoutButton>
        )}
      </div>

      <section className="mt-12">
        <h2 className="text-2xl font-bold">{t("auditHistory")}</h2>
        {audits.length === 0 ? (
          <p className="mt-4 text-slate-400">
            {t("noAudits")}{" "}
            <Link href="/" className="text-indigo-400 hover:text-indigo-300">
              {t("startOne")}
            </Link>
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {audits.map((audit) => (
              <li key={audit.id} className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{audit.normalizedUrl}</p>
                    <p className="text-xs text-slate-500">
                      {audit.createdAt?.toLocaleDateString()} · {audit.status}
                    </p>
                  </div>
                  {audit.status === "done" && (
                    <Link
                      href={`/report/${audit.id}`}
                      className="rounded bg-indigo-600 px-3 py-1 text-xs hover:bg-indigo-500"
                    >
                      {t("viewReport")}
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
