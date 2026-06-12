"use client";

import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { useRouter } from "@/i18n/navigation";
import { useState } from "react";

export function CheckoutButton({
  type,
  auditId,
  children,
  className,
}: {
  type: "report_unlock" | "subscription";
  auditId?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const t = useTranslations("billing");
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (!session?.user) {
      router.push("/auth/signin");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type, auditId }),
    });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    }
  }

  if (children) {
    return (
      <button onClick={handleClick} disabled={loading} className={className}>
        {children}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="rounded-lg bg-indigo-600 px-4 py-2 text-sm hover:bg-indigo-500 disabled:opacity-50"
    >
      {loading ? t("processing") : t("buyNow")}
    </button>
  );
}
