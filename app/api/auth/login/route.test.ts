// app/api/auth/login/route.test.ts
// Integration tests for POST /api/auth/login
// Layer: Route handler — authService is mocked; we only test HTTP concerns here
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock the service layer — route tests verify HTTP wiring, not business logic
vi.mock("@/lib/services/authService", () => ({
  loginUser: vi.fn(),
}));

import * as authService from "@/lib/services/authService";
import { POST } from "./route";

function makeReq(body: object) {
  return new NextRequest("http://localhost/api/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/login", () => {
  beforeEach(() => vi.clearAllMocks());

  // NFR4: missing email → service throws 400 → route returns 400
  it("returns 400 when email is missing (NFR4)", async () => {
    vi.mocked(authService.loginUser).mockRejectedValue({ status: 400, message: "Email is required." });
    const res = await POST(makeReq({ password: "pass1234" }));
    expect(res.status).toBe(400);
  });

  // FR2: wrong credentials → service throws 401 → route returns 401
  it("returns 401 when credentials are invalid (FR2)", async () => {
    vi.mocked(authService.loginUser).mockRejectedValue({ status: 401, message: "Invalid email or password." });
    const res = await POST(makeReq({ email: "a@b.com", password: "wrong" }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/invalid/i);
  });

  // FR2 + NFR1 happy path: valid credentials → service resolves → route returns 200 with token
  it("returns 200 with token when credentials are valid (FR2 + NFR1)", async () => {
    vi.mocked(authService.loginUser).mockResolvedValue({
      token: "jwt.token.here",
      user: { id: "u1", fullName: "A", email: "a@b.com", role: "STUDENT" },
    } as any);
    const res = await POST(makeReq({ email: "a@b.com", password: "pass1234" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.token).toBeTruthy();
    expect(body.user.email).toBe("a@b.com");
  });

  // NFR15: unexpected errors from service → 500
  it("returns 500 on unexpected error", async () => {
    vi.mocked(authService.loginUser).mockRejectedValue(new Error("DB down"));
    const res = await POST(makeReq({ email: "a@b.com", password: "pass1234" }));
    expect(res.status).toBe(500);
  });
});
