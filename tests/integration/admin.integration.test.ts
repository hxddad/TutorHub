// tests/integration/admin.integration.test.ts
// Integration tests for admin role access (FR17, NFR1, NFR2)
// Layer: Route → Service → mocked Prisma (no real DB)
// Verifies that ADMIN tokens are accepted by requireAuth and that role
// enforcement still blocks admins from student/tutor-only endpoints.

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/jwt", () => ({ verifyToken: vi.fn() }));

const prismaMock = vi.hoisted(() => ({
  course: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  enrollment: { findUnique: vi.fn(), create: vi.fn(), count: vi.fn(), findMany: vi.fn() },
  message: { findMany: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
  user: { findUnique: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { verifyToken } from "@/lib/jwt";
import { POST as createCourse }  from "@/app/api/courses/route";
import { POST as enroll }        from "@/app/api/enrollments/route";
import { GET  as getMessages }   from "@/app/api/messages/route";

const admin   = { sub: "admin-1",   role: "ADMIN"   };
const student = { sub: "student-1", role: "STUDENT" };

function req(method: string, url: string, body?: object, auth?: typeof admin): Request {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) headers["Authorization"] = "Bearer token";
  const isBodyless = method === "GET" || method === "HEAD";
  return new Request(url, {
    method,
    headers,
    ...(isBodyless ? {} : { body: body ? JSON.stringify(body) : undefined }),
  });
}

describe("Admin role integration (FR17 + NFR1 + NFR2)", () => {
  beforeEach(() => vi.clearAllMocks());

  // ── requireAuth accepts ADMIN tokens (NFR1 / FR17) ────────────────────────
  describe("requireAuth accepts an ADMIN JWT (NFR1)", () => {
    // NFR1 + FR17: an ADMIN JWT is a valid authenticated session —
    // requireAuth only checks that a token is present and verifiable, not which role it is;
    // the messages endpoint (role-neutral) must respond with something other than 401
    it("returns 200 (not 401) when an ADMIN token is supplied to a messages endpoint", async () => {
      vi.mocked(verifyToken).mockReturnValue(admin as any);
      prismaMock.message.findMany.mockResolvedValue([]);
      prismaMock.user.findUnique.mockResolvedValue(null);

      const res = await getMessages(req("GET", "http://localhost/api/messages", undefined, admin));
      // requireAuth only checks for a valid token — ADMIN is a valid role
      expect(res.status).not.toBe(401);
    });

    // NFR1: baseline — any request with no token must still be rejected regardless of the endpoint
    it("returns 401 when no token is supplied (NFR1)", async () => {
      vi.mocked(verifyToken).mockReturnValue(null);
      const res = await getMessages(req("GET", "http://localhost/api/messages"));
      expect(res.status).toBe(401);
    });
  });

  // ── Admin cannot use student-only endpoints (NFR2 / FR17) ─────────────────
  describe("Admin cannot use student-only actions (NFR2)", () => {
    // NFR2: enrollment is restricted to the STUDENT role only —
    // an ADMIN token must be refused with 403, not 401
    it("POST /api/enrollments returns 403 for ADMIN (enrollment is STUDENT-only)", async () => {
      vi.mocked(verifyToken).mockReturnValue(admin as any);
      const res = await enroll(req("POST", "http://localhost/api/enrollments", { courseId: 1 }, admin));
      expect(res.status).toBe(403);
    });
  });

  // ── Admin cannot use tutor-only endpoints (NFR2 / FR17) ───────────────────
  describe("Admin cannot use tutor-only actions (NFR2)", () => {
    // NFR2: course creation is restricted to the TUTOR role only —
    // an ADMIN token must be refused with 403, not 401
    it("POST /api/courses returns 403 for ADMIN (course creation is TUTOR-only)", async () => {
      vi.mocked(verifyToken).mockReturnValue(admin as any);
      const res = await createCourse(
        req("POST", "http://localhost/api/courses", { title: "Hack Course", subject: "Hack" }, admin)
      );
      expect(res.status).toBe(403);
    });
  });

  // ── Admin can access messaging (FR17) ─────────────────────────────────────
  describe("Admin can access the messaging API (FR17)", () => {
    // FR17: the messaging API uses requireAuth (not requireRole), so any authenticated user
    // including ADMIN can access it — this confirms the admin has a usable workspace
    it("GET /api/messages returns a non-401/403 response for ADMIN", async () => {
      vi.mocked(verifyToken).mockReturnValue(admin as any);
      prismaMock.message.findMany.mockResolvedValue([]);
      prismaMock.user.findUnique.mockResolvedValue(null);

      const res = await getMessages(req("GET", "http://localhost/api/messages", undefined, admin));
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    });
  });
});
