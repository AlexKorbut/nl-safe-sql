import { useTranslations } from "next-intl";

const PLANS = ["free", "report", "pro", "agency"] as const;

export default function PricingPage() {
  const t = useTranslations("pricing");

  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="text-center text-3xl font-bold">{t("title")}</h1>
      <p className="mt-3 text-center text-slate-400">{t("subtitle")}</p>
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((plan) => (
          <div
            key={plan}
            className={`rounded-xl border p-6 ${
              plan === "pro" ? "border-indigo-600 bg-indigo-950/30" : "border-slate-800 bg-slate-900/40"
            }`}
          >
            <h3 className="font-semibold">{t(`plans.${plan}.name`)}</h3>
            <p className="mt-2 text-3xl font-bold">{t(`plans.${plan}.price`)}</p>
            <p className="mt-4 text-sm text-slate-400 whitespace-pre-line">
              {t(`plans.${plan}.features`)}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-10 text-center text-sm text-slate-500">{t("comingSoon")}</p>
    </div>
  );
}
