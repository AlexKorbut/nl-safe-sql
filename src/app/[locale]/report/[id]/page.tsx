import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db, schema } from "@/server/db";
import { serializeReport } from "@/server/report/serialize";
import { gradeFor } from "@/server/audit/weights";
import { ScoreGauge } from "@/components/report/ScoreGauge";
import { CategoryCard } from "@/components/report/CategoryCard";
import type { CheckCategory } from "@/server/audit/types";

const CATEGORY_ORDER: CheckCategory[] = [
  "technical",
  "indexability",
  "structured_data",
  "content_eeat",
  "ads_landing",
];

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  const session = await auth();
  const audit = db.select().from(schema.audits).where(eq(schema.audits.id, id)).get();
  if (!audit) notFound();
  if (audit.status !== "done") redirect(`/${locale}/audit/${id}`);

  const entitlement = await getAuditEntitlement(id, session);
  const report = serializeReport(
    JSON.parse(audit.resultJson!),
    JSON.parse(audit.scoresJson!),
    entitlement
  );

  const t = await getTranslations("report");

  const isPaid = entitlement === "full";

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{audit.normalizedUrl}</p>
          <h1 className="mt-1 text-3xl font-bold">{t("title")}</h1>
        </div>
        {!isPaid && (
          <CheckoutButton type="report_unlock" auditId={id}>
            {t("unlock")}
          </CheckoutButton>
        )}
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-3">
        <ScoreGauge
          label={t("overall")}
          score={report.scores.overall}
          grade={t(`grades.${gradeFor(report.scores.overall)}`)}
          primary
        />
        <ScoreGauge
          label={t("seoScore")}
          score={report.scores.seo}
          grade={t(`grades.${gradeFor(report.scores.seo)}`)}
        />
        <ScoreGauge
          label={t("adsScore")}
          score={report.scores.ads}
          grade={t(`grades.${gradeFor(report.scores.ads)}`)}
        />
      </div>

      {report.topIssueIds.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-semibold">{t("topIssues")}</h2>
          <ul className="mt-4 space-y-2">
            {report.topIssueIds.map((cid) => (
              <li
                key={cid}
                className="rounded-lg border border-amber-900/50 bg-amber-950/30 px-4 py-3 text-sm"
              >
                <TopIssue id={cid} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-12 space-y-8">
        {CATEGORY_ORDER.map((cat) => (
          <CategoryCard
            key={cat}
            category={cat}
            score={report.scores.categories[cat]}
            checks={report.checks.filter((c) => c.category === cat)}
          />
        ))}
      </section>
    </div>
  );
}

async function TopIssue({ id }: { id: string }) {
  const t = await getTranslations("checks");
  return (
    <>
      <span className="font-medium">{t(`${id}.name`)}</span>
      <span className="text-slate-400"> — {t(`${id}.rec`)}</span>
    </>
  );
}
