import Link from "next/link";
import { prisma } from "@/lib/prisma";
import StudyPlanForm from "@/components/StudyPlanForm";

export default async function EditStudyPlanPage({ params }: any) {
  const plan = await prisma.studyPlan.findUnique({
    where: { id: Number(params.id) },
    include: { tasks: true },
  });

  if (!plan) return <p>Plan not found</p>;

  return (
    <main className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Edit Study Plan</h1>
        <Link href="/dashboard/tutor/study-plan/view-plans" className="inline-flex items-center rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50">
          &larr; Back to study plans
        </Link>
      </div>
      <StudyPlanForm
        initialTasks={plan.tasks}
        planId={plan.id}
      />
    </main>
  );
}