"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";

export default function SignInPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          callbackUrl: `${window.location.origin}/api/auth/callback`,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to send magic link");
        setLoading(false);
        return;
      }

      setSubmitted(true);
    } catch (err) {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  const errorMessage = searchParams.get("error");

  if (submitted) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">{t("checkEmail")}</h1>
        <p className="mt-3 text-slate-400">{t("emailSent", { email })}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-24">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      {errorMessage && (
        <div className="mt-4 p-3 rounded-lg bg-red-900/30 border border-red-800 text-sm text-red-200">
          {errorMessage}
        </div>
      )}
      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-900/30 border border-red-800 text-sm text-red-200">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label className="text-sm font-medium">{t("emailLabel")}</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-indigo-500"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-indigo-600 py-3 text-sm font-semibold hover:bg-indigo-500 disabled:opacity-50"
        >
          {loading ? t("sending") : t("sendLink")}
        </button>
      </form>
    </div>
  );
}
