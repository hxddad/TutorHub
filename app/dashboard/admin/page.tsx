import Link from "next/link";

export default function AdminDashboardPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">
        Admin Dashboard
      </h1>
      <p className="mt-2 text-slate-600">
        Welcome to the admin dashboard. User and platform management will appear here.
      </p>
      <Link
        href="/login"
        className="mt-6 inline-block text-sm font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
      >
        Back to Log in
      </Link>
    </div>
  );
}
