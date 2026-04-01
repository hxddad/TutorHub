// app/api/admin/stats/route.test.ts
// Unit tests for GET /api/admin/stats
// FR17 — admin platform overview; NFR2 (access control), NFR13 (testability)

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/services/adminService", () => ({
  getPlatformStats: vi.fn(),
}));

import { signToken } from "@/lib/jwt";
import * as adminService from "@/lib/services/adminService";
import { GET } from "./route";

const ADMIN_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const STUDENT_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const TUTOR_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc";

const mockStats = {
  users: { total: 15, students: 10, tutors: 4, admins: 1 },
  courses: { total: 8, published: 6, archived: 2 },
  enrollments: 20,
  assignments: 15,
  submissions: { total: 30, graded: 20, pending: 10 },
  recentUsers: [],
};

describe("GET /api/admin/stats", () => {
  beforeEach(() => vi.clearAllMocks());

  // ── Authentication (NFR2) ─────────────────────────────────────────────────
  it("returns 401 when no Authorization header is provided (NFR2)", async () => {
    const res = await GET(new Request("http://localhost/api/admin/stats"));
    expect(res.status).toBe(401);
  });

  // ── Authorization — admin-only (NFR2) ─────────────────────────────────────
  it("returns 403 with Forbidden error for STUDENT role (NFR2)", async () => {
    const req = new Request("http://localhost/api/admin/stats", {
      headers: { authorization: `Bearer ${signToken(STUDENT_ID, "STUDENT")}` },
    });
    const res = await GET(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe("Forbidden");
  });

  it("returns 403 with Forbidden error for TUTOR role (NFR2)", async () => {
    const req = new Request("http://localhost/api/admin/stats", {
      headers: { authorization: `Bearer ${signToken(TUTOR_ID, "TUTOR")}` },
    });
    const res = await GET(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe("Forbidden");
  });

  // ── Happy path (FR17) ─────────────────────────────────────────────────────
  it("returns 200 with platform stats for ADMIN role (FR17)", async () => {
    vi.mocked(adminService.getPlatformStats).mockResolvedValue(mockStats as any);
    const req = new Request("http://localhost/api/admin/stats", {
      headers: { authorization: `Bearer ${signToken(ADMIN_ID, "ADMIN")}` },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toMatchObject({
      users: { total: 15, students: 10 },
      enrollments: 20,
      assignments: 15,
    });
  });

  it("delegates to adminService.getPlatformStats exactly once (FR17)", async () => {
    vi.mocked(adminService.getPlatformStats).mockResolvedValue(mockStats as any);
    const req = new Request("http://localhost/api/admin/stats", {
      headers: { authorization: `Bearer ${signToken(ADMIN_ID, "ADMIN")}` },
    });
    await GET(req);
    expect(adminService.getPlatformStats).toHaveBeenCalledTimes(1);
  });

  // ── Error handling ────────────────────────────────────────────────────────
  it("returns 500 with generic message when service throws an unexpected error", async () => {
    vi.mocked(adminService.getPlatformStats).mockRejectedValue(new Error("DB connection lost"));
    const req = new Request("http://localhost/api/admin/stats", {
      headers: { authorization: `Bearer ${signToken(ADMIN_ID, "ADMIN")}` },
    });
    const res = await GET(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Failed to fetch stats");
  });

  it("returns service error status when service throws a structured { status, message } error", async () => {
    vi.mocked(adminService.getPlatformStats).mockRejectedValue({
      status: 503,
      message: "Service unavailable",
    });
    const req = new Request("http://localhost/api/admin/stats", {
      headers: { authorization: `Bearer ${signToken(ADMIN_ID, "ADMIN")}` },
    });
    const res = await GET(req);
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.error).toBe("Service unavailable");
  });
});
