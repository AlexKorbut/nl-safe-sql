"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/material/Card";
import { Key } from "lucide-react";

interface ApiToken {
  id: string;
  name: string;
  createdAt: string;
  quotaPerMonth: number;
  usedThisMonth: number;
}

export function ApiKeysList() {
  const t = useTranslations("api");
  const [keys, setKeys] = useState<ApiToken[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadKeys();
  }, []);

  async function loadKeys() {
    try {
      const res = await fetch("/api/v1/token");
      if (res.ok) {
        const data = await res.json();
        setKeys(data.tokens || []);
      }
    } catch (error) {
      console.error("Failed to load keys:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Card className="p-6 rounded-3xl border border-slate-800 text-center">
        <p className="text-slate-400">Loading...</p>
      </Card>
    );
  }

  if (keys.length === 0) {
    return (
      <Card className="p-12 rounded-3xl border border-slate-800 text-center">
        <Key className="mx-auto mb-3 w-8 h-8 text-slate-600" />
        <p className="text-slate-400">{t("noKeys")}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {keys.map((key) => (
        <Card
          key={key.id}
          className="p-4 rounded-2xl border border-slate-800 hover:border-slate-700"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="font-medium text-slate-100">{key.name}</p>
              <p className="text-xs text-slate-400 mt-1">
                {t("createdAt")}: {new Date(key.createdAt).toLocaleDateString()}
              </p>
              <div className="mt-3 w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 transition-all"
                  style={{
                    width: `${Math.round(
                      (key.usedThisMonth / key.quotaPerMonth) * 100
                    )}%`,
                  }}
                />
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {t("quota")}: {key.usedThisMonth} / {key.quotaPerMonth} {t("quotaLimit")}
              </p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
