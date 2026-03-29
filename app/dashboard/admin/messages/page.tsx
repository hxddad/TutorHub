import Link from "next/link";
import MessagesClient from "@/components/MessagesClient";

export default function AdminMessagesPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-emerald-700/80">
            Communication
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Messages</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
            Internal messaging with any user account.
          </p>
        </div>
        <Link href="/dashboard/admin" className="inline-flex items-center rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50">
          &larr; Back to dashboard
        </Link>
      </header>
      <MessagesClient />
    </div>
  );
}
