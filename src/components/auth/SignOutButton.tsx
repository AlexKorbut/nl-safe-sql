"use client";

import { useTranslations } from "next-intl";
import { signOut } from "next-auth/react";

export function SignOutButton() {
  const t = useTranslations("auth");

  return (
    <button
      onClick={() => signOut({ redirect: true, callbackUrl: "/" })}
      className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-900/50"
    >
      {t("signOut")}
    </button>
  );
}
