import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  enrollment: { findUnique: vi.fn() },
  course: { findUnique: vi.fn() },
  assignment: { findMany: vi.fn(), create: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { signToken } from "@/lib/jwt";
import { GET, POST } from "./route";

const STUDENT_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const TUTOR_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

describe("/api/assignments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("returns 400 without courseId", async () => {
      const req = new Request("http://localhost/api/assignments", {
        headers: { authorization: `Bearer ${signToken(STUDENT_ID, "STUDENT")}` },
      });
      const res = await GET(req);
      expect(res.status).toBe(400);
    });

    it("returns assignments for enrolled student", async () => {
      prismaMock.enrollment.findUnique.mockResolvedValue({
        status: "ACTIVE",
      } as never);
      prismaMock.assignment.findMany.mockResolvedValue([] as never);

      const req = new Request(`http://localhost/api/assignments?courseId=1`, {
        headers: { authorization: `Bearer ${signToken(STUDENT_ID, "STUDENT")}` },
      });
      const res = await GET(req);
      expect(res.status).toBe(200);
    });

    it("returns 403 for student not enrolled", async () => {
      prismaMock.enrollment.findUnique.mockResolvedValue(null);

      const req = new Request(`http://localhost/api/assignments?courseId=1`, {
        headers: { authorization: `Bearer ${signToken(STUDENT_ID, "STUDENT")}` },
      });
      const res = await GET(req);
      expect(res.status).toBe(403);
    });

    it("allows tutor who owns course", async () => {
      prismaMock.course.findUnique.mockResolvedValue({
        id: 1,
        tutorId: TUTOR_ID,
      } as never);
      prismaMock.assignment.findMany.mockResolvedValue([] as never);

      const req = new Request(`http://localhost/api/assignments?courseId=1`, {
        headers: { authorization: `Bearer ${signToken(TUTOR_ID, "TUTOR")}` },
      });
      const res = await GET(req);
      expect(res.status).toBe(200);
    });
  });

  describe("POST", () => {
    it("returns 403 for non-tutor", async () => {
      const req = new Request("http://localhost/api/assignments", {
        method: "POST",
        headers: {
          authorization: `Bearer ${signToken(STUDENT_ID, "STUDENT")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ courseId: 1, title: "HW" }),
      });
      const res = await POST(req);
      expect(res.status).toBe(403);
    });

    it("creates assignment when tutor owns course", async () => {
      prismaMock.course.findUnique.mockResolvedValue({
        id: 1,
        tutorId: TUTOR_ID,
      } as never);
      prismaMock.assignment.create.mockResolvedValue({
        id: 10,
        courseId: 1,
        title: "HW1",
      } as never);

      const req = new Request("http://localhost/api/assignments", {
        method: "POST",
        headers: {
          authorization: `Bearer ${signToken(TUTOR_ID, "TUTOR")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ courseId: 1, title: "HW1" }),
      });
      const res = await POST(req);
      expect(res.status).toBe(201);
    });
  });
});
