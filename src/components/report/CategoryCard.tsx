import { getTranslations } from "next-intl/server";
import type { SerializedCheck } from "@/server/report/serialize";
import type { CheckCategory } from "@/server/audit/types";
import { CheckRow } from "./CheckRow";

export async function CategoryCard({
  category,
  score,
  checks,
}: {
  category: CheckCategory;
  score: number;
  checks: SerializedCheck[];
}) {
  const t = await getTranslations("report");
  const visible = checks.filter((c) => c.status !== "na");
  if (visible.length === 0) return null;

  const barColor =
    score >= 90 ? "bg-emerald-500" : score >= 70 ? "bg-lime-500" : score >= 50 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40">
      <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
        <h3 className="font-semibold">{t(`categories.${category}`)}</h3>
        <div className="flex items-center gap-3">
          <div className="h-1.5 w-28 overflow-hidden rounded-full bg-slate-800">
            <div className={`h-full ${barColor}`} style={{ width: `${score}%` }} />
          </div>
          <span className="w-8 text-right text-sm tabular-nums text-slate-300">{score}</span>
        </div>
      </div>
      <ul className="divide-y divide-slate-800/60">
        {visible.map((check) => (
          <CheckRow key={check.id} check={check} />
        ))}
      </ul>
    </div>
  );
}
