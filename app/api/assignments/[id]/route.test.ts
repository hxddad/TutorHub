import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  assignment: { findUnique: vi.fn() },
  enrollment: { findUnique: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { signToken } from "@/lib/jwt";
import { GET } from "./route";

const STUDENT = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const TUTOR = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

describe("GET /api/assignments/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for invalid id", async () => {
    const req = new Request("http://localhost/api/assignments/abc", {
      headers: { authorization: `Bearer ${signToken(STUDENT, "STUDENT")}` },
    });
    const res = await GET(req, { params: { id: "abc" } });
    expect(res.status).toBe(400);
  });

  it("returns 404 when assignment missing", async () => {
    prismaMock.assignment.findUnique.mockResolvedValue(null);
    const req = new Request("http://localhost/api/assignments/1", {
      headers: { authorization: `Bearer ${signToken(STUDENT, "STUDENT")}` },
    });
    const res = await GET(req, { params: { id: "1" } });
    expect(res.status).toBe(404);
  });

  it("returns 403 for student not actively enrolled", async () => {
    prismaMock.assignment.findUnique.mockResolvedValue({
      id: 1,
      courseId: 5,
      course: { tutorId: TUTOR, title: "T", subject: "S" },
      submissions: [],
    } as never);
    prismaMock.enrollment.findUnique.mockResolvedValue(null);

    const req = new Request("http://localhost/api/assignments/1", {
      headers: { authorization: `Bearer ${signToken(STUDENT, "STUDENT")}` },
    });
    const res = await GET(req, { params: { id: "1" } });
    expect(res.status).toBe(403);
  });

  it("returns assignment for enrolled student", async () => {
    prismaMock.assignment.findUnique.mockResolvedValue({
      id: 1,
      courseId: 5,
      course: { id: 5, title: "T", subject: "S", tutorId: TUTOR },
      submissions: [],
    } as never);
    prismaMock.enrollment.findUnique.mockResolvedValue({
      status: "ACTIVE",
    } as never);

    const req = new Request("http://localhost/api/assignments/1", {
      headers: { authorization: `Bearer ${signToken(STUDENT, "STUDENT")}` },
    });
    const res = await GET(req, { params: { id: "1" } });
    expect(res.status).toBe(200);
  });

  it("returns 403 when tutor does not own course", async () => {
    prismaMock.assignment.findUnique.mockResolvedValue({
      id: 1,
      courseId: 5,
      course: { tutorId: "other-tutor", title: "T", subject: "S" },
      submissions: [],
    } as never);

    const req = new Request("http://localhost/api/assignments/1", {
      headers: { authorization: `Bearer ${signToken(TUTOR, "TUTOR")}` },
    });
    const res = await GET(req, { params: { id: "1" } });
    expect(res.status).toBe(403);
  });
});
