// tests/integration/recommendations.integration.test.ts
// Tests for the Next.js recommendation proxy route
// FR11 (recommendations), NFR1 (auth), graceful degradation

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/jwt", () => ({ verifyToken: vi.fn() }));

import { verifyToken } from "@/lib/jwt";
import { GET } from "@/app/api/recommendations/route";

const STUDENT = { sub: "student-1", role: "STUDENT" };
const TUTOR   = { sub: "tutor-1",   role: "TUTOR"   };

function req(payload?: typeof STUDENT): Request {
  const headers: Record<string, string> = {};
  if (payload) headers["Authorization"] = "Bearer token";
  return new Request("http://localhost/api/recommendations", { headers });
}

describe("Recommendations proxy route (FR15 + NFR1)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 with no token (NFR1)", async () => {
    vi.mocked(verifyToken).mockReturnValue(null);
    const res = await GET(req() as any);
    expect(res.status).toBe(401);
  });

  it("forwards student ID from JWT — never from query params (NFR2)", async () => {
    vi.mocked(verifyToken).mockReturnValue(STUDENT as any);

    // Mock the fetch call to the Python service
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ recommendations: [] }), { status: 200 })
    );
    vi.stubGlobal("fetch", mockFetch);

    await GET(req(STUDENT) as any);

    // The URL should contain the JWT student ID, not anything from the request
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("student-1"),
      expect.any(Object)
    );

    vi.unstubAllGlobals();
  });

  it("returns 503 when the recommendation service is unreachable (graceful degradation)", async () => {
    vi.mocked(verifyToken).mockReturnValue(STUDENT as any);

    const mockFetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));
    vi.stubGlobal("fetch", mockFetch);

    const res = await GET(req(STUDENT) as any);
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toContain("unavailable");

    vi.unstubAllGlobals();
  });

  it("returns 503 when the recommendation service returns a non-ok status", async () => {
    vi.mocked(verifyToken).mockReturnValue(STUDENT as any);

    const mockFetch = vi.fn().mockResolvedValue(new Response("", { status: 500 }));
    vi.stubGlobal("fetch", mockFetch);

    const res = await GET(req(STUDENT) as any);
    expect(res.status).toBe(500);

    vi.unstubAllGlobals();
  });

  it("passes tutor auth through — recommendations work for tutors too (FR15)", async () => {
    vi.mocked(verifyToken).mockReturnValue(TUTOR as any);

    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ recommendations: [] }), { status: 200 })
    );
    vi.stubGlobal("fetch", mockFetch);

    const res = await GET(req(TUTOR) as any);
    expect(res.status).toBe(200);

    vi.unstubAllGlobals();
  });
});
