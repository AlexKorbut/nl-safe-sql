export function ScoreGauge({
  label,
  score,
  grade,
  primary = false,
}: {
  label: string;
  score: number;
  grade: string;
  primary?: boolean;
}) {
  const color =
    score >= 90 ? "text-emerald-400" : score >= 70 ? "text-lime-400" : score >= 50 ? "text-amber-400" : "text-red-400";

  return (
    <div
      className={`rounded-xl border p-6 text-center ${
        primary ? "border-indigo-700 bg-indigo-950/40" : "border-slate-800 bg-slate-900/50"
      }`}
    >
      <p className="text-sm text-slate-400">{label}</p>
      <p className={`mt-2 text-5xl font-bold tabular-nums ${color}`}>{score}</p>
      <p className="mt-1 text-sm text-slate-400">{grade}</p>
    </div>
  );
}
