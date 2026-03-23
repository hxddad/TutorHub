import Link from "next/link";

export default function AdminDashboardPage() {
  const tiles = [
    { label: "Users", value: "—", hint: "Managed via database & future admin tools" },
    { label: "Courses", value: "—", hint: "Catalog visibility and moderation" },
    { label: "Platform", value: "Live", hint: "TutorHub dev environment" },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-8 shadow-lg shadow-slate-200/40 sm:p-10">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-slate-700 via-emerald-600 to-teal-500" />
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Administration
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Platform overview
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">
          Central oversight for users, courses, and policies — as your EECS design evolves, this
          space can grow into full management UIs.
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {tiles.map((t) => (
          <div
            key={t.label}
            className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-md shadow-slate-200/25"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t.label}</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{t.value}</p>
            <p className="mt-2 text-xs text-slate-500">{t.hint}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap gap-4">
        <Link
          href="/courses"
          className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50/50"
        >
          Browse course catalog
        </Link>
        <Link
          href="/register"
          className="inline-flex items-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-slate-800"
        >
          Registration (test)
        </Link>
      </div>
    </div>
  );
}
