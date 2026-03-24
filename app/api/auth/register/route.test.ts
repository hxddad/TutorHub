import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

vi.mock("bcrypt", () => ({
  default: { hash: vi.fn(() => Promise.resolve("hashed-password")) },
}));

import { POST } from "./route";

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when name too short", async () => {
    const req = new NextRequest("http://localhost/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        fullName: "A",
        email: "a@b.com",
        password: "password12",
        role: "STUDENT",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid email", async () => {
    const req = new NextRequest("http://localhost/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        fullName: "Ab",
        email: "not-an-email",
        password: "password12",
        role: "STUDENT",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when password under 8 chars", async () => {
    const req = new NextRequest("http://localhost/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        fullName: "Ab cd",
        email: "a@b.com",
        password: "short",
        role: "STUDENT",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when role invalid", async () => {
    const req = new NextRequest("http://localhost/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        fullName: "Ab cd",
        email: "a@b.com",
        password: "password12",
        role: "INVALID",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 409 when email exists", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "x" } as never);
    const req = new NextRequest("http://localhost/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        fullName: "Ab cd",
        email: "taken@b.com",
        password: "password12",
        role: "STUDENT",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(409);
  });

  it("returns 201 with user when registration succeeds", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({
      id: "new-id",
      fullName: "Test User",
      email: "new@b.com",
      role: "STUDENT",
      createdAt: new Date(),
    } as never);

    const req = new NextRequest("http://localhost/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        fullName: "Test User",
        email: "new@b.com",
        password: "password12",
        role: "STUDENT",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.user.email).toBe("new@b.com");
  });
});
