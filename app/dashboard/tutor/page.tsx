import Link from "next/link";

export default function TutorDashboardPage() {
  const cards = [
    {
      title: "My courses",
      description: "Create and manage course listings, capacity, and what students see in the catalog.",
      href: "/dashboard/tutor/courses",
      cta: "Manage courses",
    },
    {
      title: "Assignments",
      description: "Create tasks, set due dates, and organize work across your courses.",
      href: "/dashboard/tutor/assignments",
      cta: "Assignments",
    },
    {
      title: "Review & submissions",
      description: "Grade submissions, leave feedback, and keep the feedback loop tight.",
      href: "/dashboard/tutor/submissions",
      cta: "Open submissions",
    },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-8 shadow-lg shadow-slate-200/40 sm:p-10">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500" />
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">
          Tutor workspace
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Teach and support from one place
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">
          Run courses, assignments, and reviews in a single flow — matching the TutorHub design
          for structured tutoring and academic support.
        </p>
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.title}
            className="group flex flex-col rounded-2xl border border-slate-200/90 bg-white p-6 shadow-md shadow-slate-200/30 transition hover:border-emerald-200/80 hover:shadow-lg hover:shadow-emerald-100/40"
          >
            <h2 className="text-lg font-semibold text-slate-900">{card.title}</h2>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{card.description}</p>
            <Link
              href={card.href}
              className="mt-6 inline-flex w-fit items-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-500"
            >
              {card.cta}
              <span className="ml-1 transition group-hover:translate-x-0.5" aria-hidden>
                →
              </span>
            </Link>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-dashed border-slate-300/80 bg-slate-50/80 p-6 text-center">
        <p className="text-sm text-slate-600">
          Quick link:{" "}
          <Link
            href="/dashboard/tutor/assignments/review-assignments"
            className="font-semibold text-emerald-700 hover:text-emerald-600 hover:underline"
          >
            Review assignments
          </Link>
        </p>
      </div>
    </div>
  );
}
