// lib/repositories/submissionRepository.test.ts
// Tests for all database queries related to assignment submissions
// NFR13 (testability) - mocking Prisma so no database is needed

import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  submission: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import {
  findSubmissions,
  findExistingSubmission,
  createSubmission,
  updateSubmission,
  findSubmissionWithCourse,
  reviewSubmission,
} from "./submissionRepository";

describe("submissionRepository", () => {
  beforeEach(() => vi.clearAllMocks());

  // FR8 - fetch submissions matching a filter (e.g. by assignmentId + studentId)
  describe("findSubmissions", () => {
    it("passes the where clause directly to Prisma and orders by submission time", async () => {
      prismaMock.submission.findMany.mockResolvedValue([{ id: 1 }]);

      await findSubmissions({ assignmentId: 1 });

      expect(prismaMock.submission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { assignmentId: 1 },
          orderBy: { submittedAt: "desc" },
        })
      );
    });

    it("includes student and assignment details for the UI", async () => {
      prismaMock.submission.findMany.mockResolvedValue([]);

      await findSubmissions({});

      expect(prismaMock.submission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            student: expect.any(Object),
            assignment: expect.any(Object),
          }),
        })
      );
    });
  });

  // FR8 - checking for an existing submission before deciding create vs update
  describe("findExistingSubmission", () => {
    it("queries by both assignmentId and studentId so we find the right record", async () => {
      prismaMock.submission.findFirst.mockResolvedValue({ id: 5 });

      const result = await findExistingSubmission(1, "student-1");

      expect(prismaMock.submission.findFirst).toHaveBeenCalledWith({
        where: { assignmentId: 1, studentId: "student-1" },
      });
      expect(result).toMatchObject({ id: 5 });
    });
  });

  // FR8 - first-time submission
  describe("createSubmission", () => {
    it("creates a submission with the correct studentId from the JWT (NFR2)", async () => {
      prismaMock.submission.create.mockResolvedValue({ id: 9, studentId: "student-1" });

      await createSubmission(1, "student-1", "My answer");

      expect(prismaMock.submission.create).toHaveBeenCalledWith({
        data: { assignmentId: 1, studentId: "student-1", content: "My answer" },
      });
    });
  });

  // FR8 - resubmission: update content and clear the old grade so it can be re-reviewed
  describe("updateSubmission", () => {
    it("clears grade, feedback, and reviewedAt when a student resubmits", async () => {
      prismaMock.submission.update.mockResolvedValue({ id: 5, grade: null });

      await updateSubmission(5, "Updated answer");

      expect(prismaMock.submission.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 5 },
          data: expect.objectContaining({
            content: "Updated answer",
            grade: null,
            feedback: null,
            reviewedAt: null,
          }),
        })
      );
    });
  });

  // FR9 - loading a submission with course info so we can check tutor ownership
  describe("findSubmissionWithCourse", () => {
    it("joins through assignment to course so we can check tutorId (NFR2)", async () => {
      prismaMock.submission.findUnique.mockResolvedValue({ id: 1 });

      await findSubmissionWithCourse(1);

      expect(prismaMock.submission.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          include: expect.objectContaining({
            assignment: expect.objectContaining({
              include: { course: expect.any(Object) },
            }),
          }),
        })
      );
    });
  });

  // FR9 - saving the tutor's grade and feedback
  describe("reviewSubmission", () => {
    it("saves the grade and feedback and sets reviewedAt to now", async () => {
      prismaMock.submission.update.mockResolvedValue({ id: 1, grade: 88, feedback: "Good" });

      await reviewSubmission(1, 88, "Good work");

      expect(prismaMock.submission.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({
            grade: 88,
            feedback: "Good work",
            reviewedAt: expect.any(Date),
          }),
        })
      );
    });

    it("can save a null grade when the tutor only wants to leave feedback", async () => {
      prismaMock.submission.update.mockResolvedValue({ id: 1, grade: null, feedback: "See comments" });

      await reviewSubmission(1, null, "See comments");

      expect(prismaMock.submission.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ grade: null }),
        })
      );
    });
  });
});
