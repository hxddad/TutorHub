// taskRepository.ts
// All Prisma calls for tasks go through here
// NFR15 (maintainability) and NFR13 (testability)

import { prisma } from "@/lib/prisma";

// FR14 - load a task AND its parent study plan together
// we need the studyPlan so we can check studentId for ownership (NFR2)
export async function findTaskWithPlan(taskId: number) {
  return prisma.task.findUnique({
    where: { id: taskId },
    include: { studyPlan: true },
  });
}

// FR14 - update the completed status of a task
export async function toggleTaskCompleted(taskId: number, completed: boolean) {
  return prisma.task.update({
    where: { id: taskId },
    data: { completed },
  });
}
