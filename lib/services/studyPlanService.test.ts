// lib/services/studyPlanService.test.ts
// Unit tests for studyPlanService
// We mock the database (repository layer) so these tests run without a real DB
// Covers FR12 (create plan), FR13 (view/update), NFR2 (ownership), NFR4 (validation)

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the study plan repository - this is where all DB calls for plans go
vi.mock("@/lib/repositories/studyPlanRepository", () => ({
  findPlansByStudent: vi.fn(),
  findPlanById: vi.fn(),
  createStudyPlan: vi.fn(),
  updateStudyPlan: vi.fn(),
}));

// Also need to mock courseRepository because tutors checking access
// requires looking up their courses and the student's enrollments
vi.mock("@/lib/repositories/courseRepository", () => ({
  findCoursesByTutor: vi.fn(),
  findEnrolledCourses: vi.fn(),
}));

import * as planRepo from "@/lib/repositories/studyPlanRepository";
import * as courseRepo from "@/lib/repositories/courseRepository";
import { getStudentPlans, createPlan, updatePlan } from "./studyPlanService";

// reuse the same task in every test that needs one
const validTask = { title: "Read chapter 1", dueDate: "2026-06-01", courseId: 1 };
const mockPlan  = { id: 5, studentId: "student-1", tasks: [] };

describe("studyPlanService", () => {
  beforeEach(() => vi.clearAllMocks());

  // ── getStudentPlans ───────────────────────────────────────────────────────
  // FR13 - a student should be able to see all their own study plans
  describe("getStudentPlans", () => {
    it("returns the plans for the given student ID", async () => {
      vi.mocked(planRepo.findPlansByStudent).mockResolvedValue([mockPlan] as any);

      const result = await getStudentPlans("student-1");

      // we expect exactly one plan back, and we should have queried by the right studentId
      expect(planRepo.findPlansByStudent).toHaveBeenCalledWith("student-1");
      expect(result).toHaveLength(1);
    });

    it("returns an empty array when the student has no plans yet", async () => {
      vi.mocked(planRepo.findPlansByStudent).mockResolvedValue([]);

      const result = await getStudentPlans("student-1");

      expect(result).toHaveLength(0);
    });
  });

  // ── createPlan ────────────────────────────────────────────────────────────
  // FR12 - students should be able to create a new study plan with tasks
  describe("createPlan", () => {
    it("creates a plan and passes the correct studentId from the JWT (NFR2)", async () => {
      vi.mocked(planRepo.createStudyPlan).mockResolvedValue(mockPlan as any);

      await createPlan("student-1", { tasks: [validTask] });

      // the studentId must come from the service argument (JWT), not from the body
      expect(planRepo.createStudyPlan).toHaveBeenCalledWith(
        "student-1",
        expect.arrayContaining([expect.objectContaining({ title: "Read chapter 1" })])
      );
    });

    it("converts the dueDate string to a proper Date object before saving", async () => {
      vi.mocked(planRepo.createStudyPlan).mockResolvedValue(mockPlan as any);

      await createPlan("student-1", { tasks: [validTask] });

      expect(planRepo.createStudyPlan).toHaveBeenCalledWith(
        "student-1",
        expect.arrayContaining([expect.objectContaining({ dueDate: expect.any(Date) })])
      );
    });

    it("throws 400 when the tasks array is empty (NFR4)", async () => {
      // a study plan with no tasks is meaningless, so we reject it
      await expect(createPlan("student-1", { tasks: [] }))
        .rejects.toMatchObject({ status: 400 });
    });

    it("throws 400 when a task has no title (NFR4)", async () => {
      await expect(createPlan("student-1", { tasks: [{ dueDate: "2026-06-01", courseId: 1 }] }))
        .rejects.toMatchObject({ status: 400 });
    });

    it("throws 400 when a task has an invalid dueDate (NFR4)", async () => {
      await expect(createPlan("student-1", { tasks: [{ title: "T", dueDate: "not-a-date", courseId: 1 }] }))
        .rejects.toMatchObject({ status: 400 });
    });

    it("throws 400 when tasks is missing entirely (NFR4)", async () => {
      await expect(createPlan("student-1", {}))
        .rejects.toMatchObject({ status: 400 });
    });
  });

  // ── updatePlan ────────────────────────────────────────────────────────────
  // FR13 - students edit their own plans; tutors can edit if they share a course
  describe("updatePlan", () => {
    it("throws 404 when the plan does not exist", async () => {
      vi.mocked(planRepo.findPlanById).mockResolvedValue(null);

      await expect(updatePlan(99, "student-1", "STUDENT", { tasks: [validTask] }))
        .rejects.toMatchObject({ status: 404, message: "Study plan not found" });
    });

    it("throws 403 when a student tries to update another student's plan (NFR2)", async () => {
      // plan belongs to "other-student", but "student-1" is making the request
      vi.mocked(planRepo.findPlanById).mockResolvedValue({ ...mockPlan, studentId: "other-student" } as any);

      await expect(updatePlan(5, "student-1", "STUDENT", { tasks: [validTask] }))
        .rejects.toMatchObject({ status: 403 });
    });

    it("lets a student update their own plan (FR13)", async () => {
      vi.mocked(planRepo.findPlanById).mockResolvedValue(mockPlan as any);
      vi.mocked(planRepo.updateStudyPlan).mockResolvedValue(mockPlan as any);

      await expect(updatePlan(5, "student-1", "STUDENT", { tasks: [validTask] }))
        .resolves.toBeDefined();
    });

    it("throws 400 when task data is invalid even if the student owns the plan (NFR4)", async () => {
      vi.mocked(planRepo.findPlanById).mockResolvedValue(mockPlan as any);

      await expect(updatePlan(5, "student-1", "STUDENT", { tasks: [{ title: "", dueDate: "2026-06-01", courseId: 1 }] }))
        .rejects.toMatchObject({ status: 400 });
    });

    // NFR2 tutor path - a tutor can only edit if the student is enrolled in one of their courses
    it("throws 403 when the tutor has no shared course with the student (NFR2)", async () => {
      vi.mocked(planRepo.findPlanById).mockResolvedValue(mockPlan as any);
      // tutor teaches course 99, but student is enrolled in course 1 - no overlap
      vi.mocked(courseRepo.findCoursesByTutor).mockResolvedValue([{ id: 99 }] as any);
      vi.mocked(courseRepo.findEnrolledCourses).mockResolvedValue([
        { course: { id: 1 }, enrolledAt: new Date() },
      ] as any);

      await expect(updatePlan(5, "tutor-1", "TUTOR", { tasks: [validTask] }))
        .rejects.toMatchObject({ status: 403 });
    });

    it("lets a tutor update the plan when they share a course with the student (FR13 + NFR2)", async () => {
      vi.mocked(planRepo.findPlanById).mockResolvedValue(mockPlan as any);
      // both teach/enroll in course 1 - shared course exists
      vi.mocked(courseRepo.findCoursesByTutor).mockResolvedValue([{ id: 1 }] as any);
      vi.mocked(courseRepo.findEnrolledCourses).mockResolvedValue([
        { course: { id: 1 }, enrolledAt: new Date() },
      ] as any);
      vi.mocked(planRepo.updateStudyPlan).mockResolvedValue(mockPlan as any);

      await expect(updatePlan(5, "tutor-1", "TUTOR", { tasks: [validTask] }))
        .resolves.toBeDefined();
    });
  });
});
