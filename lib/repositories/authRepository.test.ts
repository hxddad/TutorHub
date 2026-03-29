// lib/repositories/authRepository.test.ts
// Unit tests for authRepository — all Prisma calls mocked
// Layer: Repository — no real DB touched; NFR13 (testability)

import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), create: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { findUserByEmail, createUser } from "./authRepository";

describe("authRepository", () => {
  beforeEach(() => vi.clearAllMocks());

  // FR2: look up user by email for login credential check
  it("findUserByEmail returns user when found (FR2)", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "u1", email: "a@b.com" } as never);
    const result = await findUserByEmail("a@b.com");
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { email: "a@b.com" } });
    expect(result).toMatchObject({ id: "u1" });
  });

  // FR1: returns null when email not in DB (used for duplicate check)
  it("findUserByEmail returns null when not found (FR1)", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const result = await findUserByEmail("missing@b.com");
    expect(result).toBeNull();
  });

  // FR1: creates a new user record after validation and hashing
  it("createUser persists the user and returns the created record (FR1)", async () => {
    const data = { fullName: "Alice", email: "alice@b.com", password: "hashed", role: "STUDENT" as const };
    prismaMock.user.create.mockResolvedValue({ id: "new-id", ...data, createdAt: new Date() } as never);
    const result = await createUser(data);
    expect(prismaMock.user.create).toHaveBeenCalledWith({ data });
    expect(result).toMatchObject({ id: "new-id", email: "alice@b.com" });
  });
});
