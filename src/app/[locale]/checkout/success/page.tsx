import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function CheckoutSuccessPage() {
  const t = useTranslations("billing");

  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="text-2xl font-bold text-emerald-400">✓ Payment successful!</h1>
      <p className="mt-3 text-slate-400">Thank you. Your report is now unlocked.</p>
      <Link href="/dashboard" className="mt-6 inline-block text-indigo-400 hover:text-indigo-300">
        Back to dashboard
      </Link>
    </div>
  );
}
