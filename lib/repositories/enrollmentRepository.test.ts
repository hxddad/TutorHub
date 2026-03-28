// lib/repositories/enrollmentRepository.test.ts
// Tests for enrollment database queries
// NFR13 - mocking Prisma so these run without a real database

import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  enrollment: {
    findUnique: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
  },
}));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import {
  findEnrollment,
  countActiveEnrollments,
  createEnrollment,
} from "./enrollmentRepository";

describe("enrollmentRepository", () => {
  beforeEach(() => vi.clearAllMocks());

  // FR6 - checking if a student is already enrolled (to avoid duplicates)
  describe("findEnrollment", () => {
    it("queries by the composite key (studentId + courseId)", async () => {
      prismaMock.enrollment.findUnique.mockResolvedValue({ id: 1, status: "ACTIVE" });

      const result = await findEnrollment("student-1", 5);

      // the composite unique key is studentId_courseId
      expect(prismaMock.enrollment.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { studentId_courseId: { studentId: "student-1", courseId: 5 } },
        })
      );
      expect(result).toMatchObject({ id: 1 });
    });

    it("returns null when the student is not enrolled", async () => {
      prismaMock.enrollment.findUnique.mockResolvedValue(null);

      const result = await findEnrollment("student-1", 99);

      expect(result).toBeNull();
    });
  });

  // FR6 - capacity enforcement before creating a new enrollment
  describe("countActiveEnrollments", () => {
    it("counts only ACTIVE enrollments for the course", async () => {
      prismaMock.enrollment.count.mockResolvedValue(7);

      const result = await countActiveEnrollments(3);

      expect(prismaMock.enrollment.count).toHaveBeenCalledWith({
        where: { courseId: 3, status: "ACTIVE" },
      });
      expect(result).toBe(7);
    });
  });

  // FR6 - creating a new ACTIVE enrollment when the student enrols
  describe("createEnrollment", () => {
    it("creates an ACTIVE enrollment using the student ID from the JWT (NFR2)", async () => {
      prismaMock.enrollment.create.mockResolvedValue({
        id: 1, studentId: "student-1", courseId: 5, status: "ACTIVE",
      });

      const result = await createEnrollment("student-1", 5);

      expect(prismaMock.enrollment.create).toHaveBeenCalledWith({
        data: { studentId: "student-1", courseId: 5, status: "ACTIVE" },
      });
      expect(result).toMatchObject({ studentId: "student-1" });
    });
  });
});
