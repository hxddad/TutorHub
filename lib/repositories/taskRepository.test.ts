// lib/repositories/taskRepository.test.ts
// Unit tests for taskRepository (FR14, NFR13)

import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  task: { findUnique: vi.fn(), update: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { findTaskWithPlan, toggleTaskCompleted } from "./taskRepository";

describe("taskRepository", () => {
  beforeEach(() => vi.clearAllMocks());

  it("findTaskWithPlan includes the studyPlan relation for ownership checks (NFR2)", async () => {
    prismaMock.task.findUnique.mockResolvedValue({ id: 1 });
    await findTaskWithPlan(1);
    expect(prismaMock.task.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 }, include: { studyPlan: true } })
    );
  });

  it("toggleTaskCompleted updates only the completed field (FR14)", async () => {
    prismaMock.task.update.mockResolvedValue({ id: 1, completed: true });
    await toggleTaskCompleted(1, true);
    expect(prismaMock.task.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { completed: true },
    });
  });

  it("toggleTaskCompleted can set completed to false (FR14)", async () => {
    prismaMock.task.update.mockResolvedValue({ id: 1, completed: false });
    await toggleTaskCompleted(1, false);
    expect(prismaMock.task.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { completed: false },
    });
  });
});
