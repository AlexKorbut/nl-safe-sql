"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

export function UrlForm() {
  const t = useTranslations("landing");
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/audits", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(t(`errors.${data.error === "rate_limited" ? "rateLimited" : "invalidUrl"}`));
        return;
      }
      router.push(`/audit/${data.id}`);
    } catch {
      setError(t("errors.network"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto flex max-w-xl gap-2">
      <input
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder={t("urlPlaceholder")}
        className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-indigo-500"
        required
      />
      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold hover:bg-indigo-500 disabled:opacity-50"
      >
        {submitting ? t("submitting") : t("submit")}
      </button>
      {error && <p className="absolute mt-14 text-sm text-red-400">{error}</p>}
    </form>
  );
}
