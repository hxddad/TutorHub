// lib/services/taskService.test.ts
// Unit tests for taskService (FR14, NFR2, NFR4)
// Layer: Service (business logic) — repository layer is mocked; no real DB touched

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/repositories/taskRepository", () => ({
  findTaskWithPlan: vi.fn(),
  toggleTaskCompleted: vi.fn(),
}));

import * as taskRepo from "@/lib/repositories/taskRepository";
import { toggleTask } from "./taskService";

describe("taskService — toggleTask (FR14 + NFR2 + NFR4)", () => {
  beforeEach(() => vi.clearAllMocks());

  // NFR4: the completed field must be strictly boolean — strings like "yes" / "no"
  // are rejected so the DB never receives a type-unsafe value
  it("throws 400 when completed is not a boolean (NFR4)", async () => {
    await expect(toggleTask(1, "student-1", { completed: "yes" }))
      .rejects.toMatchObject({ status: 400, message: "completed must be a boolean" });
  });

  // Resource existence: the task must exist before it can be toggled
  it("throws 404 when the task does not exist", async () => {
    vi.mocked(taskRepo.findTaskWithPlan).mockResolvedValue(null);
    await expect(toggleTask(99, "student-1", { completed: true }))
      .rejects.toMatchObject({ status: 404 });
  });

  // NFR2: a student may only toggle tasks that belong to their own study plan —
  // another student must not be able to mark someone else's tasks complete
  it("throws 403 when student does not own the task's study plan (NFR2)", async () => {
    vi.mocked(taskRepo.findTaskWithPlan).mockResolvedValue({
      id: 1,
      studyPlan: { studentId: "other-student" },
    } as any);
    await expect(toggleTask(1, "student-1", { completed: true }))
      .rejects.toMatchObject({ status: 403 });
  });

  // FR14 happy path: the owning student marks a task complete —
  // the repo is called with the correct taskId and completed=true
  it("toggles the task when the student owns the plan (NFR2 + FR14)", async () => {
    vi.mocked(taskRepo.findTaskWithPlan).mockResolvedValue({
      id: 1,
      studyPlan: { studentId: "student-1" },
    } as any);
    vi.mocked(taskRepo.toggleTaskCompleted).mockResolvedValue({ id: 1, completed: true } as any);

    const result = await toggleTask(1, "student-1", { completed: true });
    expect(taskRepo.toggleTaskCompleted).toHaveBeenCalledWith(1, true);
    expect(result).toMatchObject({ completed: true });
  });

  // FR14: toggling must work in both directions — a completed task can also be marked incomplete
  it("can also mark a task as incomplete (completed: false)", async () => {
    vi.mocked(taskRepo.findTaskWithPlan).mockResolvedValue({
      id: 1,
      studyPlan: { studentId: "student-1" },
    } as any);
    vi.mocked(taskRepo.toggleTaskCompleted).mockResolvedValue({ id: 1, completed: false } as any);

    await toggleTask(1, "student-1", { completed: false });
    expect(taskRepo.toggleTaskCompleted).toHaveBeenCalledWith(1, false);
  });
});
