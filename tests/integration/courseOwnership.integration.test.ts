// tests/integration/courseOwnership.integration.test.ts
// Targeted tests for cross-tutor ownership rules and role enforcement
// Directly addresses the weak spots for FR5, NFR1, NFR2

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/jwt", () => ({ verifyToken: vi.fn() }));

const prismaMock = vi.hoisted(() => ({
  course: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { verifyToken } from "@/lib/jwt";
import { GET, POST, PATCH, DELETE } from "@/app/api/courses/route";

const TUTOR_A = { sub: "tutor-a", role: "TUTOR" };
const TUTOR_B = { sub: "tutor-b", role: "TUTOR" };
const STUDENT = { sub: "student-1", role: "STUDENT" };

function req(method: string, url: string, body?: object, payload?: typeof TUTOR_A): Request {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (payload) headers["Authorization"] = "Bearer token";
  return new Request(url, {
    method, headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("Course ownership integration (FR5 + NFR2)", () => {
  beforeEach(() => vi.clearAllMocks());

  // ── Create ────────────────────────────────────────────────────────────────
  describe("POST /api/courses — role enforcement", () => {
    it("returns 401 with no token (NFR1)", async () => {
      vi.mocked(verifyToken).mockReturnValue(null);
      const res = await POST(req("POST", "http://localhost/api/courses", { title: "T", subject: "S" }));
      expect(res.status).toBe(401);
    });

    it("returns 403 when a STUDENT tries to create a course (NFR2)", async () => {
      vi.mocked(verifyToken).mockReturnValue(STUDENT as any);
      const res = await POST(req("POST", "http://localhost/api/courses", { title: "T", subject: "S" }, STUDENT));
      expect(res.status).toBe(403);
    });

    it("uses JWT identity — ignores any tutorId in the body (NFR2)", async () => {
      vi.mocked(verifyToken).mockReturnValue(TUTOR_A as any);
      prismaMock.course.create.mockResolvedValue({ id: 1, tutorId: "tutor-a" });
      await POST(req("POST", "http://localhost/api/courses", {
        title: "Maths", subject: "Maths", tutorId: "injected-id",
      }, TUTOR_A));
      expect(prismaMock.course.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ tutorId: "tutor-a" }) })
      );
    });

    it("returns 400 for missing title (NFR4)", async () => {
      vi.mocked(verifyToken).mockReturnValue(TUTOR_A as any);
      const res = await POST(req("POST", "http://localhost/api/courses", { subject: "S" }, TUTOR_A));
      expect(res.status).toBe(400);
    });

    it("returns 400 for missing subject (NFR4)", async () => {
      vi.mocked(verifyToken).mockReturnValue(TUTOR_A as any);
      const res = await POST(req("POST", "http://localhost/api/courses", { title: "T" }, TUTOR_A));
      expect(res.status).toBe(400);
    });

    it("returns 400 for negative price (NFR4)", async () => {
      vi.mocked(verifyToken).mockReturnValue(TUTOR_A as any);
      const res = await POST(req("POST", "http://localhost/api/courses", {
        title: "T", subject: "S", price: -10,
      }, TUTOR_A));
      expect(res.status).toBe(400);
    });
  });

  // ── Update ────────────────────────────────────────────────────────────────
  describe("PATCH /api/courses — cross-tutor ownership", () => {
    it("returns 403 when Tutor B tries to update Tutor A's course (NFR2)", async () => {
      vi.mocked(verifyToken).mockReturnValue(TUTOR_B as any);
      prismaMock.course.findUnique.mockResolvedValue({
        id: 1, tutorId: "tutor-a", title: "Old", subject: "S",
      });
      const res = await PATCH(req("PATCH", "http://localhost/api/courses?id=1", {
        title: "Stolen",
      }, TUTOR_B));
      expect(res.status).toBe(403);
    });

    it("returns 404 when course does not exist", async () => {
      vi.mocked(verifyToken).mockReturnValue(TUTOR_A as any);
      prismaMock.course.findUnique.mockResolvedValue(null);
      const res = await PATCH(req("PATCH", "http://localhost/api/courses?id=999", {
        title: "T", subject: "S",
      }, TUTOR_A));
      expect(res.status).toBe(404);
    });

    it("returns 400 when missing id param (NFR4)", async () => {
      vi.mocked(verifyToken).mockReturnValue(TUTOR_A as any);
      const res = await PATCH(req("PATCH", "http://localhost/api/courses", { title: "T" }, TUTOR_A));
      expect(res.status).toBe(400);
    });

    it("succeeds when Tutor A updates their own course (FR5)", async () => {
      vi.mocked(verifyToken).mockReturnValue(TUTOR_A as any);
      prismaMock.course.findUnique.mockResolvedValue({
        id: 1, tutorId: "tutor-a", title: "Old", subject: "Maths",
      });
      prismaMock.course.update.mockResolvedValue({ id: 1, title: "New" });
      const res = await PATCH(req("PATCH", "http://localhost/api/courses?id=1", {
        title: "New", subject: "Maths",
      }, TUTOR_A));
      expect(res.status).toBe(200);
    });
  });

  // ── Archive (DELETE endpoint) ─────────────────────────────────────────────
  describe("DELETE /api/courses — archive, not hard delete (FR5 + NFR2)", () => {
    it("returns 403 when Tutor B tries to archive Tutor A's course (NFR2)", async () => {
      vi.mocked(verifyToken).mockReturnValue(TUTOR_B as any);
      prismaMock.course.findUnique.mockResolvedValue({ id: 1, tutorId: "tutor-a" });
      const res = await DELETE(req("DELETE", "http://localhost/api/courses?id=1", undefined, TUTOR_B));
      expect(res.status).toBe(403);
    });

    it("archives (unpublishes) the course — does not hard delete (FR5)", async () => {
      vi.mocked(verifyToken).mockReturnValue(TUTOR_A as any);
      prismaMock.course.findUnique.mockResolvedValue({ id: 1, tutorId: "tutor-a" });
      // archiveCourse calls course.update, not course.delete
      prismaMock.course.update.mockResolvedValue({ id: 1, isPublished: false });
      const res = await DELETE(req("DELETE", "http://localhost/api/courses?id=1", undefined, TUTOR_A));
      expect(res.status).toBe(200);
      // must use update (archive), never delete
      expect(prismaMock.course.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isPublished: false } })
      );
    });

    it("returns 401 with no token (NFR1)", async () => {
      vi.mocked(verifyToken).mockReturnValue(null);
      const res = await DELETE(new Request("http://localhost/api/courses?id=1", { method: "DELETE" }));
      expect(res.status).toBe(401);
    });
  });
});
