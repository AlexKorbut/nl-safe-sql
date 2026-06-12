import { getTranslations } from "next-intl/server";
import { Card } from "@/components/material/Card";
import { Button } from "@/components/material/Button";
import { Chip } from "@/components/material/Chip";
import { BarChart3, TrendingUp, Gift, Users } from "lucide-react";

export default async function PartnerPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const t = await getTranslations("partner");

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      {/* Hero */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-medium mb-4 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] bg-clip-text text-transparent">
          {t("title")}
        </h1>
        <p className="text-lg text-[var(--on-surface-variant)] mb-6">{t("subtitle")}</p>
        <Button variant="filled" size="large">
          {t("applyNow")}
        </Button>
      </div>

      {/* Benefits grid */}
      <div className="grid sm:grid-cols-2 gap-6 mb-12">
        {[
          { icon: Gift, title: "Commissions", desc: "Earn 20-30% on every referral" },
          { icon: TrendingUp, title: "Growth", desc: "Scale your agency revenue" },
          { icon: Users, title: "Support", desc: "Dedicated partner manager" },
          { icon: BarChart3, title: "Analytics", desc: "Real-time tracking dashboard" },
        ].map((benefit) => (
          <Card key={benefit.title} elevated>
            <benefit.icon className="w-8 h-8 text-[var(--primary)] mb-3" />
            <h3 className="text-lg font-medium mb-2">{benefit.title}</h3>
            <p className="text-sm text-[var(--on-surface-variant)]">{benefit.desc}</p>
          </Card>
        ))}
      </div>

      {/* Pricing for partners */}
      <div className="mb-12">
        <h2 className="text-2xl font-medium mb-6 text-center">{t("commission")}</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { tier: "Starter", rate: "20%", min: "0 ref/mo" },
            { tier: "Pro", rate: "25%", min: "5+ ref/mo" },
            { tier: "Elite", rate: "30%", min: "20+ ref/mo" },
          ].map((level) => (
            <Card key={level.tier} outlined className="text-center py-6">
              <h4 className="font-medium text-lg mb-2">{level.tier}</h4>
              <div className="text-3xl font-bold text-[var(--primary)] mb-2">{level.rate}</div>
              <p className="text-xs text-[var(--on-surface-variant)]">{level.min}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="bg-[var(--surface-variant)] rounded-3xl p-8">
        <h2 className="text-2xl font-medium mb-6">{t("faq")}</h2>
        <div className="space-y-4">
          {[
            {
              q: "How do I get paid?",
              a: "Commissions are paid monthly via wire transfer or Stripe.",
            },
            { q: "Can I use a custom link?", a: "Yes, we provide branded referral links for all partners." },
            { q: "Is there a minimum?", a: "No minimum, but elite tiers require activity targets." },
          ].map((item, i) => (
            <div key={i}>
              <button className="w-full text-left font-medium py-2 hover:text-[var(--primary)] transition">
                {item.q}
              </button>
              <p className="text-sm text-[var(--on-surface-variant)] pb-3">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
