// studyPlanRepository.ts
// All Prisma calls for study plans go through here
// NFR15 (maintainability) and NFR13 (testability) - keeps DB logic separate from business logic

import { prisma } from "@/lib/prisma";

export interface TaskData {
  title: string;
  dueDate: Date;
  courseId: number;
}

// FR12/FR13 - get all study plans for a given student
export async function findPlansByStudent(studentId: string) {
  return prisma.studyPlan.findMany({
    where: { studentId },
    include: { tasks: true },
  });
}

// FR13/FR14 - look up a single plan so we can verify ownership before allowing edits
export async function findPlanById(id: number) {
  return prisma.studyPlan.findUnique({
    where: { id },
    include: { tasks: true },
  });
}

// FR12 - create a new study plan with its tasks all in one transaction
export async function createStudyPlan(studentId: string, tasks: TaskData[]) {
  return prisma.studyPlan.create({
    data: {
      studentId,
      tasks: { create: tasks },
    },
    include: { tasks: true },
  });
}

// FR13 - replace all tasks on an existing plan
// we delete the old ones and create fresh ones so the order is always clean
export async function updateStudyPlan(planId: number, tasks: TaskData[]) {
  return prisma.studyPlan.update({
    where: { id: planId },
    data: {
      tasks: {
        deleteMany: {},
        create: tasks,
      },
    },
    include: { tasks: true },
  });
}
