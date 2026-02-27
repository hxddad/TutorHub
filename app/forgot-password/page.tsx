import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-slate-50 via-emerald-50/40 to-blue-50/50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-[420px] rounded-2xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/50 overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 to-emerald-600" />
        <div className="p-8 sm:p-10 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Forgot password?</h1>
        <p className="mt-2 text-slate-600 text-sm">Password reset — coming soon.</p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
        >
          Back to Log in
        </Link>
        </div>
      </div>
    </div>
  );
}
