// lib/repositories/adminRepository.test.ts
// Unit tests for adminRepository — all Prisma calls are mocked
// FR17 — admin platform overview; NFR13 (testability), NFR15 (maintainability)

import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  user: {
    groupBy: vi.fn(),
    findMany: vi.fn(),
  },
  course: {
    count: vi.fn(),
  },
  enrollment: {
    count: vi.fn(),
  },
  assignment: {
    count: vi.fn(),
  },
  submission: {
    count: vi.fn(),
  },
}));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import {
  countUsers,
  countCourses,
  countEnrollments,
  countAssignments,
  countSubmissions,
  recentUsers,
} from "./adminRepository";

describe("adminRepository", () => {
  beforeEach(() => vi.clearAllMocks());

  // ── countUsers (FR17) ─────────────────────────────────────────────────────
  describe("countUsers (FR17)", () => {
    it("groups users by role and returns the raw groupBy result", async () => {
      const groups = [
        { role: "STUDENT", _count: { id: 10 } },
        { role: "TUTOR", _count: { id: 5 } },
        { role: "ADMIN", _count: { id: 1 } },
      ];
      prismaMock.user.groupBy.mockResolvedValue(groups);
      const result = await countUsers();
      expect(prismaMock.user.groupBy).toHaveBeenCalledWith({
        by: ["role"],
        _count: { id: true },
      });
      expect(result).toEqual(groups);
    });

    it("returns an empty array when there are no users", async () => {
      prismaMock.user.groupBy.mockResolvedValue([]);
      const result = await countUsers();
      expect(result).toEqual([]);
    });
  });

  // ── countCourses (FR17) ───────────────────────────────────────────────────
  describe("countCourses (FR17)", () => {
    it("returns total, published, and derived archived count", async () => {
      prismaMock.course.count
        .mockResolvedValueOnce(10)  // total
        .mockResolvedValueOnce(7);  // published
      const result = await countCourses();
      expect(result).toEqual({ total: 10, published: 7, archived: 3 });
    });

    it("queries published courses with isPublished:true filter", async () => {
      prismaMock.course.count.mockResolvedValueOnce(5).mockResolvedValueOnce(5);
      await countCourses();
      expect(prismaMock.course.count).toHaveBeenCalledWith({ where: { isPublished: true } });
    });

    it("returns archived:0 when all courses are published", async () => {
      prismaMock.course.count.mockResolvedValueOnce(4).mockResolvedValueOnce(4);
      const result = await countCourses();
      expect(result).toEqual({ total: 4, published: 4, archived: 0 });
    });
  });

  // ── countEnrollments (FR17) ───────────────────────────────────────────────
  describe("countEnrollments (FR17)", () => {
    it("counts only ACTIVE enrollments", async () => {
      prismaMock.enrollment.count.mockResolvedValue(20);
      const result = await countEnrollments();
      expect(prismaMock.enrollment.count).toHaveBeenCalledWith({ where: { status: "ACTIVE" } });
      expect(result).toBe(20);
    });

    it("returns 0 when there are no active enrollments", async () => {
      prismaMock.enrollment.count.mockResolvedValue(0);
      const result = await countEnrollments();
      expect(result).toBe(0);
    });
  });

  // ── countAssignments (FR17) ───────────────────────────────────────────────
  describe("countAssignments (FR17)", () => {
    it("counts all assignments with no filter", async () => {
      prismaMock.assignment.count.mockResolvedValue(15);
      const result = await countAssignments();
      expect(prismaMock.assignment.count).toHaveBeenCalled();
      expect(result).toBe(15);
    });
  });

  // ── countSubmissions (FR17) ───────────────────────────────────────────────
  describe("countSubmissions (FR17)", () => {
    it("returns total, graded, and derived pending count", async () => {
      prismaMock.submission.count
        .mockResolvedValueOnce(30)  // total
        .mockResolvedValueOnce(20); // graded
      const result = await countSubmissions();
      expect(result).toEqual({ total: 30, graded: 20, pending: 10 });
    });

    it("queries graded submissions where grade is not null", async () => {
      prismaMock.submission.count.mockResolvedValueOnce(5).mockResolvedValueOnce(3);
      await countSubmissions();
      expect(prismaMock.submission.count).toHaveBeenCalledWith({
        where: { grade: { not: null } },
      });
    });

    it("returns pending:0 when all submissions are graded", async () => {
      prismaMock.submission.count.mockResolvedValueOnce(8).mockResolvedValueOnce(8);
      const result = await countSubmissions();
      expect(result).toEqual({ total: 8, graded: 8, pending: 0 });
    });
  });

  // ── recentUsers (FR17) ────────────────────────────────────────────────────
  describe("recentUsers (FR17)", () => {
    it("fetches users ordered by createdAt desc with default limit 5", async () => {
      const users = [
        { id: "1", fullName: "Alice", email: "a@b.com", role: "STUDENT", createdAt: new Date() },
      ];
      prismaMock.user.findMany.mockResolvedValue(users);
      const result = await recentUsers();
      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: "desc" }, take: 5 })
      );
      expect(result).toEqual(users);
    });

    it("respects a custom limit", async () => {
      prismaMock.user.findMany.mockResolvedValue([]);
      await recentUsers(3);
      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 3 })
      );
    });

    it("selects only safe fields — no password hash (NFR2)", async () => {
      prismaMock.user.findMany.mockResolvedValue([]);
      await recentUsers();
      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.objectContaining({
            id: true,
            fullName: true,
            email: true,
            role: true,
            createdAt: true,
          }),
        })
      );
    });

    it("select does not include password field (NFR2 — security)", async () => {
      prismaMock.user.findMany.mockResolvedValue([]);
      await recentUsers();
      const call = prismaMock.user.findMany.mock.calls[0][0];
      expect(call.select).not.toHaveProperty("password");
    });
  });
});
