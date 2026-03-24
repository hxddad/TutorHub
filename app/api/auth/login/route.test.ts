import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

vi.mock("bcrypt", () => ({
  default: { compare: vi.fn() },
}));

import bcrypt from "bcrypt";
import { POST } from "./route";

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when email missing", async () => {
    const req = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ password: "x" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 401 when user not found", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "no@one.com", password: "password12" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 401 when password wrong", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "u1",
      email: "a@b.com",
      password: "hash",
      role: "STUDENT",
      fullName: "A",
    } as never);
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

    const req = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "a@b.com", password: "wrongpass" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 200 with token when credentials valid", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "u1",
      email: "a@b.com",
      password: "hash",
      role: "STUDENT",
      fullName: "A",
    } as never);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

    const req = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "a@b.com", password: "password12" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.token).toBeTruthy();
    expect(body.user.email).toBe("a@b.com");
  });
});
