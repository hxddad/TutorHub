import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  studyPlan: {
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  user: { findUnique: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { GET, POST, PUT } from "./route";

describe("/api/study-plans", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET returns 400 without studentId", async () => {
    const req = new Request("http://localhost/api/study-plans");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("GET returns plans for student", async () => {
    prismaMock.studyPlan.findMany.mockResolvedValue([{ id: 1, tasks: [] }] as never);
    const req = new Request("http://localhost/api/study-plans?studentId=s1");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(1);
  });

  it("POST returns 400 when student missing", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const req = new Request("http://localhost/api/study-plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: "bad",
        tasks: [{ title: "T", dueDate: "2025-01-01", courseId: 1 }],
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("POST creates plan with tasks", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "s1" } as never);
    prismaMock.studyPlan.create.mockResolvedValue({
      id: 10,
      studentId: "s1",
      tasks: [{ id: 1, title: "Read", courseId: 1 }],
    } as never);

    const req = new Request("http://localhost/api/study-plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: "s1",
        tasks: [{ title: "Read", dueDate: "2025-06-01T00:00:00.000Z", courseId: 1 }],
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it("PUT replaces tasks on plan", async () => {
    prismaMock.studyPlan.update.mockResolvedValue({
      id: 5,
      tasks: [{ title: "New", courseId: 1 }],
    } as never);

    const req = new Request("http://localhost/api/study-plans", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        planId: 5,
        tasks: [{ title: "New", dueDate: "2025-07-01T00:00:00.000Z", courseId: 1 }],
      }),
    });
    const res = await PUT(req);
    expect(res.status).toBe(200);
  });
});
