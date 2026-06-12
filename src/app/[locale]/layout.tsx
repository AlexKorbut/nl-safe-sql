import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import "../globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("common");
  return { title: t("appName"), description: t("tagline") };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const t = await getTranslations("common");
  const otherLocale = locale === "en" ? "ru" : "en";

  return (
    <html lang={locale} className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100">
        <NextIntlClientProvider>
            <header className="border-b border-slate-800">
              <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
                <Link href="/" className="text-lg font-bold tracking-tight">
                  {t("appName")}
                </Link>
                <nav className="flex items-center gap-6 text-sm text-slate-300">
                  <Link href="/pricing" className="hover:text-white">
                    {t("nav.pricing")}
                  </Link>
                  <Link href="/auth/signin" className="hover:text-white">
                    Sign in
                  </Link>
                  <Link href="/" locale={otherLocale} className="hover:text-white uppercase">
                    {otherLocale}
                  </Link>
                </nav>
              </div>
            </header>
          <main className="flex-1">{children}</main>
          <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
            {t("appName")} · {new Date().getFullYear()}
          </footer>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
