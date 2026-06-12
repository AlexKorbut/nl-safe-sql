import { getTranslations } from "next-intl/server";
import type { SerializedCheck } from "@/server/report/serialize";

const STATUS_ICON: Record<string, { icon: string; cls: string }> = {
  pass: { icon: "✓", cls: "text-emerald-400" },
  warn: { icon: "!", cls: "text-amber-400" },
  fail: { icon: "✕", cls: "text-red-400" },
  na: { icon: "–", cls: "text-slate-600" },
};

export async function CheckRow({ check }: { check: SerializedCheck }) {
  const t = await getTranslations("checks");
  const tr = await getTranslations("report");
  const { icon, cls } = STATUS_ICON[check.status];

  return (
    <li className="px-5 py-3">
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 w-4 text-center font-bold ${cls}`}>{icon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{t(`${check.id}.name`)}</p>
          {check.locked ? (
            <p className="mt-1 select-none text-xs text-slate-500 blur-[3px]">
              {tr("lockedTeaser")}
            </p>
          ) : (
            <>
              {check.status !== "pass" && (
                <p className="mt-1 text-xs text-slate-400">{t(`${check.id}.rec`)}</p>
              )}
              {check.detailsParams && (
                <p className="mt-1 text-xs text-slate-500">
                  {Object.entries(check.detailsParams)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(" · ")}
                </p>
              )}
            </>
          )}
        </div>
        {check.locked && <span className="text-xs text-slate-500">🔒</span>}
      </div>
    </li>
  );
}
