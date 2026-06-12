import { useTranslations } from "next-intl";
import { UrlForm } from "@/components/audit/UrlForm";

export default function LandingPage() {
  const t = useTranslations("landing");

  return (
    <div className="mx-auto max-w-3xl px-4 py-20 text-center">
      <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
        {t("heroTitle")}
      </h1>
      <p className="mt-5 text-lg text-slate-300">{t("heroSubtitle")}</p>
      <div className="mt-10">
        <UrlForm />
      </div>
      <div className="mt-16 grid gap-6 sm:grid-cols-3 text-left">
        {(["seo", "ads", "actionable"] as const).map((key) => (
          <div key={key} className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
            <h3 className="font-semibold">{t(`features.${key}.title`)}</h3>
            <p className="mt-2 text-sm text-slate-400">{t(`features.${key}.body`)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
