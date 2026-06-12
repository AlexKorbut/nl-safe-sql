"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/material/Card";
import { Button } from "@/components/material/Button";

export function ApiKeyCreateForm() {
  const t = useTranslations("api");
  const [keyName, setKeyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSecret, setShowSecret] = useState<string | null>(null);

  async function handleCreate() {
    if (!keyName.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/v1/token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: keyName }),
      });

      if (res.ok) {
        const data = await res.json();
        setShowSecret(data.token);
        setKeyName("");
      }
    } catch (error) {
      console.error("Failed to create key:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {showSecret && (
        <Card className="p-4 rounded-2xl border border-amber-900/50 bg-amber-950/30">
          <p className="text-sm font-medium">{t("successMessage")}</p>
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-slate-900 p-3">
            <code className="flex-1 text-xs text-slate-300 overflow-auto font-mono break-all">
              {showSecret}
            </code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(showSecret);
                alert(t("copied"));
              }}
              className="text-xs font-medium text-blue-400 hover:text-blue-300 whitespace-nowrap ml-2"
            >
              {t("copy")}
            </button>
          </div>
          <p className="mt-2 text-xs text-amber-200">{t("warning")}</p>
        </Card>
      )}

      <Card className="p-6 rounded-3xl border border-slate-800">
        <h3 className="text-lg font-medium mb-2">{t("createButton")}</h3>
        <p className="text-sm text-slate-400 mb-4">{t("warning")}</p>
        <div className="space-y-3">
          <input
            type="text"
            placeholder={t("namePlaceholder")}
            value={keyName}
            onChange={(e) => setKeyName(e.target.value)}
            maxLength={100}
            className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-indigo-500"
          />
          <Button
            variant="filled"
            disabled={!keyName.trim() || loading}
            onClick={handleCreate}
          >
            {loading ? "Creating..." : t("generate")}
          </Button>
        </div>
      </Card>
    </>
  );
}
