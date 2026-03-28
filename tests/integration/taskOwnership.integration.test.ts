// tests/integration/taskOwnership.integration.test.ts
// Targeted tests for task toggle ownership (FR14, NFR1, NFR2, NFR4)

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/jwt", () => ({ verifyToken: vi.fn() }));

const prismaMock = vi.hoisted(() => ({
  task: { findUnique: vi.fn(), update: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { verifyToken } from "@/lib/jwt";
import { PATCH } from "@/app/api/tasks/[id]/route";

const STUDENT_A = { sub: "student-a", role: "STUDENT" };
const STUDENT_B = { sub: "student-b", role: "STUDENT" };
const TUTOR    = { sub: "tutor-1",   role: "TUTOR"   };

function req(body: object, payload?: typeof STUDENT_A): Request {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (payload) headers["Authorization"] = "Bearer token";
  return new Request("http://localhost/api/tasks/1", {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  });
}

describe("Task ownership integration (FR14 + NFR1 + NFR2 + NFR4)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 with no token (NFR1)", async () => {
    vi.mocked(verifyToken).mockReturnValue(null);
    const res = await PATCH(req({ completed: true }), { params: { id: "1" } });
    expect(res.status).toBe(401);
  });

  it("returns 403 when a TUTOR tries to toggle a task (NFR2 — students only)", async () => {
    vi.mocked(verifyToken).mockReturnValue(TUTOR as any);
    const res = await PATCH(req({ completed: true }, TUTOR), { params: { id: "1" } });
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid task id (not a number)", async () => {
    vi.mocked(verifyToken).mockReturnValue(STUDENT_A as any);
    const res = await PATCH(req({ completed: true }, STUDENT_A), { params: { id: "abc" } });
    expect(res.status).toBe(400);
  });

  it("returns 400 when completed is not a boolean (NFR4)", async () => {
    vi.mocked(verifyToken).mockReturnValue(STUDENT_A as any);
    // findTaskWithPlan should NOT be called because validation fails first
    const res = await PATCH(req({ completed: "yes" }, STUDENT_A), { params: { id: "1" } });
    expect(res.status).toBe(400);
    expect(prismaMock.task.findUnique).not.toHaveBeenCalled();
  });

  it("returns 404 when task does not exist", async () => {
    vi.mocked(verifyToken).mockReturnValue(STUDENT_A as any);
    prismaMock.task.findUnique.mockResolvedValue(null);
    const res = await PATCH(req({ completed: true }, STUDENT_A), { params: { id: "99" } });
    expect(res.status).toBe(404);
  });

  it("returns 403 when student tries to toggle another student's task (NFR2)", async () => {
    vi.mocked(verifyToken).mockReturnValue(STUDENT_A as any);
    // Task belongs to student-b's plan
    prismaMock.task.findUnique.mockResolvedValue({
      id: 1,
      studyPlan: { studentId: "student-b" },
    });
    const res = await PATCH(req({ completed: true }, STUDENT_A), { params: { id: "1" } });
    expect(res.status).toBe(403);
  });

  it("toggles task to true when student owns the plan (FR14)", async () => {
    vi.mocked(verifyToken).mockReturnValue(STUDENT_A as any);
    prismaMock.task.findUnique.mockResolvedValue({
      id: 1,
      studyPlan: { studentId: "student-a" },
    });
    prismaMock.task.update.mockResolvedValue({ id: 1, completed: true });

    const res = await PATCH(req({ completed: true }, STUDENT_A), { params: { id: "1" } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.completed).toBe(true);
    expect(prismaMock.task.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { completed: true } })
    );
  });

  it("toggles task back to false (FR14 — undo completion)", async () => {
    vi.mocked(verifyToken).mockReturnValue(STUDENT_A as any);
    prismaMock.task.findUnique.mockResolvedValue({
      id: 1,
      studyPlan: { studentId: "student-a" },
    });
    prismaMock.task.update.mockResolvedValue({ id: 1, completed: false });

    const res = await PATCH(req({ completed: false }, STUDENT_A), { params: { id: "1" } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.completed).toBe(false);
  });
});
