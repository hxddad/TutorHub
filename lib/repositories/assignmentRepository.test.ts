// lib/repositories/assignmentRepository.test.ts
// Tests for all database queries related to assignments
// We mock Prisma so no real database is needed - NFR13 (testability)

import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  assignment: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
  },
}));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import {
  findAssignmentsByCourse,
  findAssignmentByIdForTutor,
  findAssignmentByIdForStudent,
  createAssignment,
  findAssignmentCourseId,
} from "./assignmentRepository";

describe("assignmentRepository", () => {
  beforeEach(() => vi.clearAllMocks());

  // FR7 - getting all assignments for a course
  describe("findAssignmentsByCourse", () => {
    it("queries by courseId and orders by newest first", async () => {
      prismaMock.assignment.findMany.mockResolvedValue([{ id: 1, title: "HW1" }]);

      const result = await findAssignmentsByCourse(1);

      expect(prismaMock.assignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { courseId: 1 },
          orderBy: { createdAt: "desc" },
        })
      );
      expect(result).toHaveLength(1);
    });

    it("includes submission count so the UI can show how many students submitted", async () => {
      prismaMock.assignment.findMany.mockResolvedValue([]);

      await findAssignmentsByCourse(1);

      // _count.submissions is used in the dashboard to show submission totals
      expect(prismaMock.assignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({ _count: { select: { submissions: true } } }),
        })
      );
    });
  });

  // FR7 - tutor or enrolled-student view of an assignment
  describe("findAssignmentByIdForTutor", () => {
    it("includes all submissions with student details (tutors need to see who submitted)", async () => {
      prismaMock.assignment.findUnique.mockResolvedValue({ id: 1, submissions: [] });

      await findAssignmentByIdForTutor(1);

      expect(prismaMock.assignment.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          include: expect.objectContaining({
            submissions: expect.objectContaining({
              include: { student: expect.any(Object) },
            }),
          }),
        })
      );
    });
  });

  // FR7 - student view of an assignment (sees only their own submission)
  describe("findAssignmentByIdForStudent", () => {
    it("filters submissions to only show the requesting student's own work (NFR2)", async () => {
      prismaMock.assignment.findUnique.mockResolvedValue({ id: 1, submissions: [] });

      await findAssignmentByIdForStudent(1, "student-1");

      // The where clause on submissions is what enforces data isolation
      expect(prismaMock.assignment.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          include: expect.objectContaining({
            submissions: { where: { studentId: "student-1" } },
          }),
        })
      );
    });
  });

  // FR7 - creating a new assignment
  describe("createAssignment", () => {
    it("passes all provided fields to Prisma", async () => {
      const data = { courseId: 1, title: "Homework 1", description: "Read ch1", dueDate: null };
      prismaMock.assignment.create.mockResolvedValue({ id: 1, ...data });

      const result = await createAssignment(data);

      expect(prismaMock.assignment.create).toHaveBeenCalledWith({ data });
      expect(result).toMatchObject({ id: 1 });
    });
  });

  // Used internally to check ownership before allowing submission
  describe("findAssignmentCourseId", () => {
    it("returns the courseId for a known assignment", async () => {
      prismaMock.assignment.findUnique.mockResolvedValue({ courseId: 3 });

      const result = await findAssignmentCourseId(10);

      expect(result).toBe(3);
      // only select the courseId to keep this query lightweight
      expect(prismaMock.assignment.findUnique).toHaveBeenCalledWith({
        where: { id: 10 },
        select: { courseId: true },
      });
    });

    it("returns null when the assignment does not exist", async () => {
      prismaMock.assignment.findUnique.mockResolvedValue(null);

      const result = await findAssignmentCourseId(999);

      expect(result).toBeNull();
    });
  });
});
