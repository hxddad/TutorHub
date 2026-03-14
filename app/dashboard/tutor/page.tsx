import Link from "next/link";
import { headers } from "next/headers";
import CreateCourseForm from "@/components/CreateCourseForm";

export default function TutorDashboardPage() {
  const hdrs = headers();
  const userId = hdrs.get("x-user-id") || "";

  return (
    <main className="py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-2xl font-semibold mb-2">Tutor Dashboard</h1>
        <p className="text-slate-600 mb-6">
          Manage your courses, create assignments and review student submissions.
        </p>

        <div className="flex flex-wrap gap-3 mb-8">
          <Link
            href="/dashboard/tutor/assignments"
            className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 transition"
          >
            Manage assignments
          </Link>
          <Link
            href="/dashboard/tutor/submissions"
            className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 transition"
          >
            Review submissions
          </Link>
        </div>

        <h2 className="text-lg font-semibold mb-4">Create a new course</h2>
        <CreateCourseForm tutorId={userId} />
      </div>
    </main>
  );
}
