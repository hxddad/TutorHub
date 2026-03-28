// tests/integration/studyPlanOwnership.integration.test.ts
// Targeted tests for study-plan ownership and access rules
// FR12, FR13, NFR1, NFR2

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/jwt", () => ({ verifyToken: vi.fn() }));

const prismaMock = vi.hoisted(() => ({
  studyPlan: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  course: { findMany: vi.fn() },
  enrollment: { findMany: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { verifyToken } from "@/lib/jwt";
import { GET, POST, PUT } from "@/app/api/study-plans/route";

const STUDENT_A = { sub: "student-a", role: "STUDENT" };
const STUDENT_B = { sub: "student-b", role: "STUDENT" };
const TUTOR_UNRELATED = { sub: "tutor-no-shared", role: "TUTOR" };
const TUTOR_SHARED = { sub: "tutor-shared", role: "TUTOR" };

const validTask = { title: "Read ch1", dueDate: "2026-06-01T00:00:00.000Z", courseId: 1 };

function req(method: string, url: string, body?: object, payload?: typeof STUDENT_A): Request {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (payload) headers["Authorization"] = "Bearer token";
  return new Request(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
}

describe("Study plan ownership integration (FR12 + FR13 + NFR2)", () => {
  beforeEach(() => vi.clearAllMocks());

  // ── GET — students only see their own plans ───────────────────────────────
  describe("GET /api/study-plans", () => {
    it("student A cannot read student B's plans — query param studentId is ignored (NFR2)", async () => {
      vi.mocked(verifyToken).mockReturnValue(STUDENT_A as any);
      prismaMock.studyPlan.findMany.mockResolvedValue([]);

      // Attacker passes student B's id in the query string
      const res = await GET(req("GET", "http://localhost/api/study-plans?studentId=student-b", undefined, STUDENT_A));
      expect(res.status).toBe(200);
      // Must query by student-a (from JWT), not student-b
      expect(prismaMock.studyPlan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { studentId: "student-a" } })
      );
    });

    it("tutor is refused GET — study plans are student-only (NFR2)", async () => {
      vi.mocked(verifyToken).mockReturnValue(TUTOR_SHARED as any);
      const res = await GET(req("GET", "http://localhost/api/study-plans", undefined, TUTOR_SHARED));
      expect(res.status).toBe(403);
    });

    it("returns 401 with no token (NFR1)", async () => {
      vi.mocked(verifyToken).mockReturnValue(null);
      const res = await GET(new Request("http://localhost/api/study-plans"));
      expect(res.status).toBe(401);
    });
  });

  // ── POST — creates plan for JWT student only ──────────────────────────────
  describe("POST /api/study-plans", () => {
    it("body studentId is ignored — plan is always created for the JWT student (NFR2)", async () => {
      vi.mocked(verifyToken).mockReturnValue(STUDENT_A as any);
      prismaMock.studyPlan.create.mockResolvedValue({ id: 1, studentId: "student-a", tasks: [] });

      const res = await POST(req("POST", "http://localhost/api/study-plans", {
        studentId: "student-b",  // should be ignored
        tasks: [validTask],
      }, STUDENT_A));

      expect(res.status).toBe(200);
      expect(prismaMock.studyPlan.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ studentId: "student-a" }) })
      );
    });

    it("tutor cannot create a study plan (NFR2)", async () => {
      vi.mocked(verifyToken).mockReturnValue(TUTOR_SHARED as any);
      const res = await POST(req("POST", "http://localhost/api/study-plans", { tasks: [validTask] }, TUTOR_SHARED));
      expect(res.status).toBe(403);
    });
  });

  // ── PUT — ownership and tutor shared-course check ─────────────────────────
  describe("PUT /api/study-plans", () => {
    it("student A cannot update student B's plan (NFR2)", async () => {
      vi.mocked(verifyToken).mockReturnValue(STUDENT_A as any);
      // Plan belongs to student-b
      prismaMock.studyPlan.findUnique.mockResolvedValue({ id: 5, studentId: "student-b", tasks: [] });

      const res = await PUT(req("PUT", "http://localhost/api/study-plans", {
        planId: 5, tasks: [validTask],
      }, STUDENT_A));
      expect(res.status).toBe(403);
    });

    it("student A can update their own plan (FR13)", async () => {
      vi.mocked(verifyToken).mockReturnValue(STUDENT_A as any);
      prismaMock.studyPlan.findUnique.mockResolvedValue({ id: 5, studentId: "student-a", tasks: [] });
      prismaMock.studyPlan.update.mockResolvedValue({ id: 5, tasks: [] });

      const res = await PUT(req("PUT", "http://localhost/api/study-plans", {
        planId: 5, tasks: [validTask],
      }, STUDENT_A));
      expect(res.status).toBe(200);
    });

    it("tutor with NO shared course cannot update a student's plan (NFR2)", async () => {
      vi.mocked(verifyToken).mockReturnValue(TUTOR_UNRELATED as any);
      prismaMock.studyPlan.findUnique.mockResolvedValue({ id: 5, studentId: "student-a", tasks: [] });

      // Tutor teaches course 99; student is enrolled in course 1 — no overlap
      prismaMock.course.findMany.mockResolvedValue([{ id: 99, tutorId: "tutor-no-shared" }]);
      prismaMock.enrollment.findMany.mockResolvedValue([
        { course: { id: 1 }, enrolledAt: new Date() },
      ]);

      const res = await PUT(req("PUT", "http://localhost/api/study-plans", {
        planId: 5, tasks: [validTask],
      }, TUTOR_UNRELATED));
      expect(res.status).toBe(403);
    });

    it("tutor WITH a shared course can update the student's plan (FR13)", async () => {
      vi.mocked(verifyToken).mockReturnValue(TUTOR_SHARED as any);
      prismaMock.studyPlan.findUnique.mockResolvedValue({ id: 5, studentId: "student-a", tasks: [] });

      // Tutor teaches course 1; student is enrolled in course 1 — shared
      prismaMock.course.findMany.mockResolvedValue([
        { id: 1, tutorId: "tutor-shared", tutor: {} },
      ]);
      prismaMock.enrollment.findMany.mockResolvedValue([
        { course: { id: 1 }, enrolledAt: new Date() },
      ]);
      prismaMock.studyPlan.update.mockResolvedValue({ id: 5, tasks: [] });

      const res = await PUT(req("PUT", "http://localhost/api/study-plans", {
        planId: 5, tasks: [validTask],
      }, TUTOR_SHARED));
      expect(res.status).toBe(200);
    });

    it("returns 400 when planId is missing (NFR4)", async () => {
      vi.mocked(verifyToken).mockReturnValue(STUDENT_A as any);
      const res = await PUT(req("PUT", "http://localhost/api/study-plans", {
        tasks: [validTask],
      }, STUDENT_A));
      expect(res.status).toBe(400);
    });
  });
});
