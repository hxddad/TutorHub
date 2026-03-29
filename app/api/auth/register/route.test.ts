// app/api/auth/register/route.test.ts
// Integration tests for POST /api/auth/register
// Layer: Route handler — authService is mocked; we only test HTTP concerns here
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock the service layer — route tests verify HTTP wiring, not business logic
vi.mock("@/lib/services/authService", () => ({
  registerUser: vi.fn(),
}));

import * as authService from "@/lib/services/authService";
import { POST } from "./route";

function makeReq(body: object) {
  return new NextRequest("http://localhost/api/auth/register", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/register", () => {
  beforeEach(() => vi.clearAllMocks());

  // FR1: service throws 400 → route returns 400 with the error message
  it("returns 400 when authService rejects validation (FR1)", async () => {
    vi.mocked(authService.registerUser).mockRejectedValue({
      status: 400,
      message: "Name must be at least 2 characters.",
    });
    const res = await POST(makeReq({ fullName: "A", email: "a@b.com", password: "pass1234", role: "STUDENT" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/2 characters/);
  });

  // FR1: duplicate email → service throws 409 → route returns 409
  it("returns 409 when email already exists (FR1)", async () => {
    vi.mocked(authService.registerUser).mockRejectedValue({
      status: 409,
      message: "An account with this email already exists.",
    });
    const res = await POST(makeReq({ fullName: "Test User", email: "taken@b.com", password: "pass1234", role: "STUDENT" }));
    expect(res.status).toBe(409);
  });

  // FR1 happy path: service resolves → route returns 200 with success + user
  it("returns 200 with user when registration succeeds (FR1)", async () => {
    vi.mocked(authService.registerUser).mockResolvedValue({
      id: "new-id",
      fullName: "Test User",
      email: "new@b.com",
      role: "STUDENT",
      createdAt: new Date(),
    } as any);
    const res = await POST(makeReq({ fullName: "Test User", email: "new@b.com", password: "pass1234", role: "STUDENT" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.user.email).toBe("new@b.com");
  });

  // NFR15: route never calls Prisma/bcrypt directly — all errors from service are relayed
  it("returns 500 when authService throws an unexpected error", async () => {
    vi.mocked(authService.registerUser).mockRejectedValue(new Error("DB exploded"));
    const res = await POST(makeReq({ fullName: "Test User", email: "new@b.com", password: "pass1234", role: "STUDENT" }));
    expect(res.status).toBe(500);
  });
});
