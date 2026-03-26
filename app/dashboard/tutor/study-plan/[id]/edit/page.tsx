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
      <h1 className="text-2xl font-semibold mb-4">Edit Study Plan</h1>
      <StudyPlanForm
        studentId={plan.studentId}
        initialTasks={plan.tasks} 
        planId={plan.id}          
      />
    </main>
  );
}