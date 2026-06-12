import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function ErrorPage() {
  const t = useTranslations("auth");

  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="text-2xl font-bold text-red-400">Auth Error</h1>
      <p className="mt-3 text-slate-400">Something went wrong during sign-in.</p>
      <Link href="/auth/signin" className="mt-6 inline-block text-indigo-400 hover:text-indigo-300">
        Try again
      </Link>
    </div>
  );
}
