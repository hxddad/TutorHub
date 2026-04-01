// lib/services/adminService.test.ts
// Unit tests for adminService — repository layer is mocked
// FR17 — admin platform overview; NFR13 (testability), NFR15 (separation of concerns)

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/repositories/adminRepository", () => ({
  countUsers: vi.fn(),
  countCourses: vi.fn(),
  countEnrollments: vi.fn(),
  countAssignments: vi.fn(),
  countSubmissions: vi.fn(),
  recentUsers: vi.fn(),
}));

import * as adminRepo from "@/lib/repositories/adminRepository";
import { getPlatformStats } from "./adminService";

const mockRecentUsers = [
  { id: "u1", fullName: "Alice", email: "alice@test.com", role: "STUDENT", createdAt: new Date() },
];

function setupDefaultMocks() {
  vi.mocked(adminRepo.countUsers).mockResolvedValue([
    { role: "STUDENT", _count: { id: 10 } } as any,
    { role: "TUTOR", _count: { id: 4 } } as any,
    { role: "ADMIN", _count: { id: 1 } } as any,
  ]);
  vi.mocked(adminRepo.countCourses).mockResolvedValue({ total: 8, published: 6, archived: 2 } as any);
  vi.mocked(adminRepo.countEnrollments).mockResolvedValue(20 as any);
  vi.mocked(adminRepo.countAssignments).mockResolvedValue(15 as any);
  vi.mocked(adminRepo.countSubmissions).mockResolvedValue({ total: 30, graded: 20, pending: 10 } as any);
  vi.mocked(adminRepo.recentUsers).mockResolvedValue(mockRecentUsers as any);
}

describe("adminService — getPlatformStats (FR17)", () => {
  beforeEach(() => vi.clearAllMocks());

  // ── User count aggregation ────────────────────────────────────────────────
  describe("user count aggregation", () => {
    it("sums all role counts into users.total (FR17)", async () => {
      setupDefaultMocks();
      const stats = await getPlatformStats();
      // 10 students + 4 tutors + 1 admin = 15
      expect(stats.users.total).toBe(15);
    });

    it("maps STUDENT group to users.students (FR17)", async () => {
      setupDefaultMocks();
      const stats = await getPlatformStats();
      expect(stats.users.students).toBe(10);
    });

    it("maps TUTOR group to users.tutors (FR17)", async () => {
      setupDefaultMocks();
      const stats = await getPlatformStats();
      expect(stats.users.tutors).toBe(4);
    });

    it("maps ADMIN group to users.admins (FR17)", async () => {
      setupDefaultMocks();
      const stats = await getPlatformStats();
      expect(stats.users.admins).toBe(1);
    });

    it("handles empty userGroups — all counts default to 0 (FR17 edge case)", async () => {
      vi.mocked(adminRepo.countUsers).mockResolvedValue([]);
      vi.mocked(adminRepo.countCourses).mockResolvedValue({ total: 0, published: 0, archived: 0 } as any);
      vi.mocked(adminRepo.countEnrollments).mockResolvedValue(0 as any);
      vi.mocked(adminRepo.countAssignments).mockResolvedValue(0 as any);
      vi.mocked(adminRepo.countSubmissions).mockResolvedValue({ total: 0, graded: 0, pending: 0 } as any);
      vi.mocked(adminRepo.recentUsers).mockResolvedValue([]);

      const stats = await getPlatformStats();
      expect(stats.users).toEqual({ total: 0, students: 0, tutors: 0, admins: 0 });
    });

    it("handles partial role groups (e.g. no admin registered yet)", async () => {
      vi.mocked(adminRepo.countUsers).mockResolvedValue([
        { role: "STUDENT", _count: { id: 3 } } as any,
      ]);
      vi.mocked(adminRepo.countCourses).mockResolvedValue({ total: 0, published: 0, archived: 0 } as any);
      vi.mocked(adminRepo.countEnrollments).mockResolvedValue(0 as any);
      vi.mocked(adminRepo.countAssignments).mockResolvedValue(0 as any);
      vi.mocked(adminRepo.countSubmissions).mockResolvedValue({ total: 0, graded: 0, pending: 0 } as any);
      vi.mocked(adminRepo.recentUsers).mockResolvedValue([]);

      const stats = await getPlatformStats();
      expect(stats.users.total).toBe(3);
      expect(stats.users.students).toBe(3);
      expect(stats.users.tutors).toBe(0);
      expect(stats.users.admins).toBe(0);
    });
  });

  // ── Pass-through fields ───────────────────────────────────────────────────
  describe("pass-through fields (FR17)", () => {
    it("returns all expected top-level keys", async () => {
      setupDefaultMocks();
      const stats = await getPlatformStats();
      expect(stats).toHaveProperty("users");
      expect(stats).toHaveProperty("courses");
      expect(stats).toHaveProperty("enrollments");
      expect(stats).toHaveProperty("assignments");
      expect(stats).toHaveProperty("submissions");
      expect(stats).toHaveProperty("recentUsers");
    });

    it("passes courses stats through unchanged", async () => {
      setupDefaultMocks();
      const stats = await getPlatformStats();
      expect(stats.courses).toEqual({ total: 8, published: 6, archived: 2 });
    });

    it("passes enrollments count through unchanged", async () => {
      setupDefaultMocks();
      const stats = await getPlatformStats();
      expect(stats.enrollments).toBe(20);
    });

    it("passes assignments count through unchanged", async () => {
      setupDefaultMocks();
      const stats = await getPlatformStats();
      expect(stats.assignments).toBe(15);
    });

    it("passes submissions stats through unchanged", async () => {
      setupDefaultMocks();
      const stats = await getPlatformStats();
      expect(stats.submissions).toEqual({ total: 30, graded: 20, pending: 10 });
    });

    it("passes recentUsers array through unchanged", async () => {
      setupDefaultMocks();
      const stats = await getPlatformStats();
      expect(stats.recentUsers).toEqual(mockRecentUsers);
    });
  });

  // ── Concurrency / delegation ──────────────────────────────────────────────
  describe("repository delegation", () => {
    it("calls all 6 repo functions exactly once per invocation", async () => {
      setupDefaultMocks();
      await getPlatformStats();
      expect(adminRepo.countUsers).toHaveBeenCalledTimes(1);
      expect(adminRepo.countCourses).toHaveBeenCalledTimes(1);
      expect(adminRepo.countEnrollments).toHaveBeenCalledTimes(1);
      expect(adminRepo.countAssignments).toHaveBeenCalledTimes(1);
      expect(adminRepo.countSubmissions).toHaveBeenCalledTimes(1);
      expect(adminRepo.recentUsers).toHaveBeenCalledTimes(1);
    });

    it("calls recentUsers with limit 5 (FR17)", async () => {
      setupDefaultMocks();
      await getPlatformStats();
      expect(adminRepo.recentUsers).toHaveBeenCalledWith(5);
    });
  });
});
