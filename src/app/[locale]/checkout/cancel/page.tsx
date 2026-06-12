import { Link } from "@/i18n/navigation";

export default function CheckoutCancelPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="text-2xl font-bold text-amber-400">Payment cancelled</h1>
      <p className="mt-3 text-slate-400">No charges were made. Feel free to try again.</p>
      <Link href="/" className="mt-6 inline-block text-indigo-400 hover:text-indigo-300">
        Back home
      </Link>
    </div>
  );
}
