"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

export function SignOutButton() {
  const t = useTranslations("auth");
  const router = useRouter();

  async function handleSignOut() {
    // Clear auth cookie and redirect
    document.cookie = "auth-token=; Max-Age=0; path=/;";
    router.push("/");
  }

  return (
    <button
      onClick={handleSignOut}
      className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-900/50"
    >
      {t("signOut")}
    </button>
  );
}
