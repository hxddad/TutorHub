// FR5 — edit page for a specific tutor course

import EditCourseForm from "@/components/EditCourseForm";

export default async function EditCoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const courseId = Number(id);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-8 shadow-lg shadow-slate-200/40 sm:p-10">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500" />
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">
          Course management
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Edit course
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">
          Update course details and control student visibility.
        </p>
      </div>

      <div className="mt-8">
        <EditCourseForm courseId={courseId} />
      </div>
    </div>
  );
}
