"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { signIn } from "next-auth/react";
import { useRouter } from "@/i18n/navigation";

export default function SignInPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const result = await signIn("resend", { email, redirect: false });
    setLoading(false);
    if (result?.ok) {
      setSubmitted(true);
    }
  }

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
      <p className="mt-6 text-center text-sm text-slate-400">
        {t("orGoogle")}{" "}
        <button
          onClick={() => signIn("google", { redirect: false })}
          className="text-indigo-400 hover:text-indigo-300"
        >
          {t("google")}
        </button>
      </p>
    </div>
  );
}
