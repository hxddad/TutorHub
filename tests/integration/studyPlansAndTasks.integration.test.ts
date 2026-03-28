// tests/integration/studyPlansAndTasks.integration.test.ts
// Integration tests for study plans and task toggling
// Tests route → service → repo → mocked Prisma (FR12, FR13, FR14, NFR1, NFR2)

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/jwt", () => ({ verifyToken: vi.fn() }));

const prismaMock = vi.hoisted(() => ({
  studyPlan: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  task:      { findUnique: vi.fn(), update: vi.fn() },
  // needed for the tutor shared-course ownership check in studyPlanService
  course:     { findMany: vi.fn() },
  enrollment: { findMany: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { verifyToken } from "@/lib/jwt";
import { GET, POST, PUT } from "@/app/api/study-plans/route";
import { PATCH as patchTask } from "@/app/api/tasks/[id]/route";

const student = { sub: "student-1", role: "STUDENT" };
const tutor   = { sub: "tutor-1",   role: "TUTOR"   };

const validTask = { title: "Read ch1", dueDate: "2026-06-01T00:00:00.000Z", courseId: 1 };

// Fix: do NOT attach a body for GET/HEAD — Node throws "Request with GET/HEAD method cannot have body"
function req(method: string, url: string, body?: object, payload?: typeof student): Request {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (payload) headers["Authorization"] = "Bearer token";
  const isBodyless = method === "GET" || method === "HEAD";
  return new Request(url, {
    method,
    headers,
    ...(isBodyless ? {} : { body: body ? JSON.stringify(body) : undefined }),
  });
}

describe("Study plans & tasks integration (FR12–FR14 + NFR1 + NFR2)", () => {
  beforeEach(() => vi.clearAllMocks());

  // ── GET study plans (FR13) ────────────────────────────────────────────────
  describe("GET /api/study-plans", () => {
    it("returns only the logged-in student's plans — ignores ?studentId (NFR2)", async () => {
      vi.mocked(verifyToken).mockReturnValue(student as any);
      prismaMock.studyPlan.findMany.mockResolvedValue([{ id: 1, tasks: [] }]);

      // No body passed — the helper must not attach one for GET
      const res = await GET(req("GET", "http://localhost/api/study-plans?studentId=attacker", undefined, student));
      expect(res.status).toBe(200);
      expect(prismaMock.studyPlan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { studentId: "student-1" } })
      );
    });

    it("returns 403 when a TUTOR calls GET (NFR2 — study plans are student-only)", async () => {
      vi.mocked(verifyToken).mockReturnValue(tutor as any);
      const res = await GET(req("GET", "http://localhost/api/study-plans", undefined, tutor));
      expect(res.status).toBe(403);
    });
  });

  // ── POST study plans (FR12) ───────────────────────────────────────────────
  describe("POST /api/study-plans", () => {
    it("creates plan with the JWT student ID — ignores body studentId (NFR2)", async () => {
      vi.mocked(verifyToken).mockReturnValue(student as any);
      prismaMock.studyPlan.create.mockResolvedValue({ id: 10, studentId: "student-1", tasks: [] });

      const res = await POST(req("POST", "http://localhost/api/study-plans", {
        studentId: "injected-attacker-id", // must be ignored
        tasks: [validTask],
      }, student));

      expect(res.status).toBe(200);
      expect(prismaMock.studyPlan.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ studentId: "student-1" }) })
      );
    });

    it("returns 400 for empty tasks array (NFR4)", async () => {
      vi.mocked(verifyToken).mockReturnValue(student as any);
      const res = await POST(req("POST", "http://localhost/api/study-plans", { tasks: [] }, student));
      expect(res.status).toBe(400);
    });
  });

  // ── PUT study plans (FR13) ────────────────────────────────────────────────
  describe("PUT /api/study-plans", () => {
    it("returns 403 when student tries to update another student's plan (NFR2)", async () => {
      vi.mocked(verifyToken).mockReturnValue(student as any);
      prismaMock.studyPlan.findUnique.mockResolvedValue({ id: 5, studentId: "other-student", tasks: [] });

      const res = await PUT(req("PUT", "http://localhost/api/study-plans", { planId: 5, tasks: [validTask] }, student));
      expect(res.status).toBe(403);
    });

    it("updates the plan for an authenticated student who owns it (FR13)", async () => {
      vi.mocked(verifyToken).mockReturnValue(student as any);
      prismaMock.studyPlan.findUnique.mockResolvedValue({ id: 5, studentId: "student-1", tasks: [] });
      prismaMock.studyPlan.update.mockResolvedValue({ id: 5, tasks: [{ title: "Read ch1" }] });

      const res = await PUT(req("PUT", "http://localhost/api/study-plans", { planId: 5, tasks: [validTask] }, student));
      expect(res.status).toBe(200);
    });

    // NFR2 — tutor can only edit if the student shares a course with them
    it("returns 403 when a TUTOR has no course in common with the student (NFR2)", async () => {
      vi.mocked(verifyToken).mockReturnValue(tutor as any);
      prismaMock.studyPlan.findUnique.mockResolvedValue({ id: 5, studentId: "student-1", tasks: [] });
      // Tutor teaches course 99; student is enrolled in course 1 — no overlap
      prismaMock.course.findMany.mockResolvedValue([{ id: 99, tutorId: "tutor-1" }]);
      prismaMock.enrollment.findMany.mockResolvedValue([
        { course: { id: 1 }, enrolledAt: new Date() },
      ]);

      const res = await PUT(req("PUT", "http://localhost/api/study-plans", { planId: 5, tasks: [validTask] }, tutor));
      expect(res.status).toBe(403);
    });

    // FR13 — tutor can edit when they share at least one course with the student
    it("allows a TUTOR to update a student's plan when they share a course (FR13 + NFR2)", async () => {
      vi.mocked(verifyToken).mockReturnValue(tutor as any);
      prismaMock.studyPlan.findUnique.mockResolvedValue({ id: 5, studentId: "student-1", tasks: [] });
      // Tutor teaches course 1; student is enrolled in course 1 — shared course exists
      prismaMock.course.findMany.mockResolvedValue([
        { id: 1, tutorId: "tutor-1", tutor: { id: "tutor-1", fullName: "T", avatar: null } },
      ]);
      prismaMock.enrollment.findMany.mockResolvedValue([
        { course: { id: 1, title: "Maths" }, enrolledAt: new Date() },
      ]);
      prismaMock.studyPlan.update.mockResolvedValue({ id: 5, tasks: [] });

      const res = await PUT(req("PUT", "http://localhost/api/study-plans", { planId: 5, tasks: [validTask] }, tutor));
      expect(res.status).toBe(200);
    });
  });

  // ── PATCH tasks (FR14) ────────────────────────────────────────────────────
  describe("PATCH /api/tasks/[id]", () => {
    it("toggles task when student owns the plan (FR14 + NFR2)", async () => {
      vi.mocked(verifyToken).mockReturnValue(student as any);
      prismaMock.task.findUnique.mockResolvedValue({ id: 1, studyPlan: { studentId: "student-1" } });
      prismaMock.task.update.mockResolvedValue({ id: 1, completed: true });

      const res = await patchTask(
        req("PATCH", "http://localhost/api/tasks/1", { completed: true }, student),
        { params: { id: "1" } }
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.completed).toBe(true);
    });

    it("returns 403 when student does not own the task's plan (NFR2)", async () => {
      vi.mocked(verifyToken).mockReturnValue(student as any);
      prismaMock.task.findUnique.mockResolvedValue({ id: 1, studyPlan: { studentId: "other-student" } });

      const res = await patchTask(
        req("PATCH", "http://localhost/api/tasks/1", { completed: true }, student),
        { params: { id: "1" } }
      );
      expect(res.status).toBe(403);
    });

    it("returns 400 for non-boolean completed value (NFR4)", async () => {
      vi.mocked(verifyToken).mockReturnValue(student as any);
      const res = await patchTask(
        req("PATCH", "http://localhost/api/tasks/1", { completed: "yes" }, student),
        { params: { id: "1" } }
      );
      expect(res.status).toBe(400);
    });

    it("returns 401 when unauthenticated (NFR1)", async () => {
      vi.mocked(verifyToken).mockReturnValue(null);
      const res = await patchTask(
        new Request("http://localhost/api/tasks/1", { method: "PATCH", body: JSON.stringify({ completed: true }) }),
        { params: { id: "1" } }
      );
      expect(res.status).toBe(401);
    });
  });
});
