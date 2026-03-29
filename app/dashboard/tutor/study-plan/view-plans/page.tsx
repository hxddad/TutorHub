import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/jwt";
import { cookies } from "next/headers";
import StudyPlanCard from "@/components/StudyPlanCard";

export default async function TutorStudyPlansPage() {
  try {
    const token = cookies().get("authToken")?.value;
    if (!token) return <p>Please log in</p>;

    const payload = verifyToken(token);
    if (!payload || payload.role !== "TUTOR") return <p>Forbidden</p>;

    // Fetch all study plans (later we can filter by tutor's students)
    const studyPlans = await prisma.studyPlan.findMany({
      include: {
        tasks: true,
        student: true, // assuming relation exists
      },
      orderBy: { createdAt: "desc" },

    });


    return (
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-8 shadow-lg shadow-slate-200/40 sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">
            Tutor workspace
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Study Plans
          </h1>
          <p className="mt-3 text-slate-600">
            Review and manage student study plans.
          </p>
        </div>


    
        {/* Study Plans */}
        <div className="mt-10 space-y-6">
          {studyPlans.length === 0 ? (
            <p>No study plans found.</p>
          ) : (
            studyPlans.map((plan) => (
              <StudyPlanCard
                key={plan.id}
                planId={plan.id}
                studentName={plan.student?.fullName ?? "Student"}
                createdAt={plan.createdAt.toISOString()}
                tasks={plan.tasks.map(t => ({
                  id: t.id,
                  title: t.title,
                  courseId: String(t.courseId),
                  dueDate: t.dueDate.toISOString(),
                  completed: t.completed ?? false,
                }))}
              />
            ))
          )}
        </div>
        

        {/* Back button */}
        <div className="mt-8">
          <Link
            href="/dashboard/tutor"
            className="inline-flex items-center rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
          >
            &larr; Back to dashboard
          </Link>
        </div>
      </div>
    );
  } catch (err) {
    console.error(err);
    return <p>Error loading study plans</p>;
  }
}