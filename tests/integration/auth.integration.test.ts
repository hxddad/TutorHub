// tests/integration/auth.integration.test.ts
// Integration tests for registration and login flow
// Layer: Route → Service → mocked Prisma (no real DB)
// Tests the full HTTP request/response cycle for FR1, FR2, NFR1, NFR4

import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), create: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

// Mock bcrypt so tests are fast and deterministic
vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed-password"),
    compare: vi.fn(),
  },
  hash: vi.fn().mockResolvedValue("hashed-password"),
  compare: vi.fn(),
}));

import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { POST as register } from "@/app/api/auth/register/route";
import { POST as login }    from "@/app/api/auth/login/route";

// NOTE: Must use absolute URLs — Node's Request constructor rejects relative paths
function postReq(url: string, body: object): NextRequest {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

describe("Auth integration (FR1 + FR2 + NFR1)", () => {
  beforeEach(() => vi.clearAllMocks());

  // ── Registration ──────────────────────────────────────────────────────────
  describe("POST /api/auth/register (FR1)", () => {
    // FR1 happy path: valid new student account — DB creates the user and returns 200
    it("registers a new student successfully", async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue({
        id: "u1", fullName: "Alice", email: "alice@test.com", role: "STUDENT", createdAt: new Date(),
      });

      const res = await register(postReq("http://localhost/api/auth/register", {
        fullName: "Alice", email: "alice@test.com", password: "password123", role: "STUDENT",
      }));

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.user.role).toBe("STUDENT");
    });

    // NFR4 password policy: passwords under 8 characters are rejected before the DB is touched
    it("returns 400 when password is too short (NFR4)", async () => {
      const res = await register(postReq("http://localhost/api/auth/register", {
        fullName: "Alice", email: "alice@test.com", password: "short", role: "STUDENT",
      }));
      expect(res.status).toBe(400);
    });

    // FR1: email uniqueness — attempting to register with an already-used email returns 409
    it("returns 409 when email already exists (FR1)", async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: "existing" });
      const res = await register(postReq("http://localhost/api/auth/register", {
        fullName: "Alice", email: "alice@test.com", password: "password123", role: "STUDENT",
      }));
      expect(res.status).toBe(409);
    });

    // NFR4 email format: a string that is not a valid email address must be rejected at the API layer
    it("returns 400 for invalid email format (NFR4)", async () => {
      const res = await register(postReq("http://localhost/api/auth/register", {
        fullName: "Alice", email: "not-an-email", password: "password123", role: "STUDENT",
      }));
      expect(res.status).toBe(400);
    });

    // NFR4 role validation: only STUDENT and TUTOR are valid roles —
    // an arbitrary string like "HACKER" must be rejected to prevent privilege escalation
    it("returns 400 for invalid role (NFR4)", async () => {
      const res = await register(postReq("http://localhost/api/auth/register", {
        fullName: "Alice", email: "alice@test.com", password: "password123", role: "HACKER",
      }));
      expect(res.status).toBe(400);
    });
  });

  // ── Login ─────────────────────────────────────────────────────────────────
  describe("POST /api/auth/login (FR2 + NFR1)", () => {
    // FR2 + NFR1 happy path: correct credentials produce a JWT token in the response body
    it("returns a JWT token on successful login", async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: "u1", fullName: "Alice", email: "alice@test.com", password: "hashed", role: "STUDENT",
      });
      vi.mocked(bcrypt.compare).mockResolvedValue(true as any);

      const res = await login(postReq("http://localhost/api/auth/login", {
        email: "alice@test.com", password: "password123",
      }));

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.token).toBeTruthy();
      expect(body.user.email).toBe("alice@test.com");
    });

    // NFR1 security: a wrong password must return 401 — no hint about which field is wrong
    // (avoids leaking whether the email exists)
    it("returns 401 for wrong password (NFR1)", async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: "u1", email: "alice@test.com", password: "hashed", role: "STUDENT",
      });
      vi.mocked(bcrypt.compare).mockResolvedValue(false as any);

      const res = await login(postReq("http://localhost/api/auth/login", {
        email: "alice@test.com", password: "wrongpassword",
      }));
      expect(res.status).toBe(401);
    });

    // NFR1 security: an unknown email returns 401 — same status as wrong password
    // so an attacker cannot enumerate registered email addresses
    it("returns 401 for unknown email (NFR1)", async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      const res = await login(postReq("http://localhost/api/auth/login", {
        email: "nobody@test.com", password: "password123",
      }));
      expect(res.status).toBe(401);
    });

    // NFR4: email is required to look up the account — omitting it is a bad request
    it("returns 400 when email is missing (NFR4)", async () => {
      const res = await login(postReq("http://localhost/api/auth/login", { password: "password123" }));
      expect(res.status).toBe(400);
    });
  });
});
