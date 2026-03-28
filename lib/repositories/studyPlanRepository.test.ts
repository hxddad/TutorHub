// lib/repositories/studyPlanRepository.test.ts
// Unit tests for studyPlanRepository (FR12, FR13, NFR13)

import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  studyPlan: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import {
  findPlansByStudent,
  findPlanById,
  createStudyPlan,
  updateStudyPlan,
} from "./studyPlanRepository";

const tasks = [{ title: "Read", dueDate: new Date("2026-06-01"), courseId: 1 }];

describe("studyPlanRepository", () => {
  beforeEach(() => vi.clearAllMocks());

  it("findPlansByStudent filters by studentId and includes tasks (FR13)", async () => {
    prismaMock.studyPlan.findMany.mockResolvedValue([]);
    await findPlansByStudent("student-1");
    expect(prismaMock.studyPlan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { studentId: "student-1" },
        include: { tasks: true },
      })
    );
  });

  it("findPlanById queries by id and includes tasks (FR13)", async () => {
    prismaMock.studyPlan.findUnique.mockResolvedValue({ id: 5 });
    await findPlanById(5);
    expect(prismaMock.studyPlan.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 5 }, include: { tasks: true } })
    );
  });

  it("createStudyPlan creates plan with nested tasks in one call (FR12)", async () => {
    prismaMock.studyPlan.create.mockResolvedValue({ id: 10 });
    await createStudyPlan("student-1", tasks);
    expect(prismaMock.studyPlan.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          studentId: "student-1",
          tasks: { create: tasks },
        }),
      })
    );
  });

  it("updateStudyPlan deletes old tasks and creates new ones atomically (FR13)", async () => {
    prismaMock.studyPlan.update.mockResolvedValue({ id: 5 });
    await updateStudyPlan(5, tasks);
    expect(prismaMock.studyPlan.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 5 },
        data: expect.objectContaining({
          tasks: { deleteMany: {}, create: tasks },
        }),
      })
    );
  });
});
