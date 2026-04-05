// lib/services/authService.test.ts
// Unit tests for authService — repository and bcrypt are mocked
// Layer: Service (business logic) — NFR13 (testability), NFR15 (SRP)

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/repositories/authRepository", () => ({
  findUserByEmail: vi.fn(),
  createUser: vi.fn(),
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash:    vi.fn(() => Promise.resolve("hashed-password")),
    compare: vi.fn(),
  },
}));

vi.mock("@/lib/jwt", () => ({ signToken: vi.fn(() => "mocked.jwt.token") }));

import * as authRepo from "@/lib/repositories/authRepository";
import bcrypt from "bcryptjs";
import { registerUser, loginUser } from "./authService";

const validRegisterInput = {
  fullName: "Test User",
  email: "test@example.com",
  password: "password123",
  role: "STUDENT",
};

describe("authService", () => {
  beforeEach(() => vi.clearAllMocks());

  // ── registerUser (FR1 + NFR4) ─────────────────────────────────────────────
  describe("registerUser (FR1 + NFR4)", () => {
    // NFR4: name must be at least 2 chars
    it("throws 400 when fullName is too short (NFR4)", async () => {
      await expect(registerUser({ ...validRegisterInput, fullName: "A" }))
        .rejects.toMatchObject({ status: 400, message: expect.stringContaining("2 characters") });
    });

    // NFR4: email must be a valid format
    it("throws 400 when email format is invalid (NFR4)", async () => {
      await expect(registerUser({ ...validRegisterInput, email: "not-an-email" }))
        .rejects.toMatchObject({ status: 400, message: expect.stringContaining("valid email") });
    });

    // NFR4: password must be at least 8 characters
    it("throws 400 when password is under 8 characters (NFR4)", async () => {
      await expect(registerUser({ ...validRegisterInput, password: "short" }))
        .rejects.toMatchObject({ status: 400, message: expect.stringContaining("8 characters") });
    });

    // NFR4: role must be one of the valid values
    it("throws 400 when role is invalid (NFR4)", async () => {
      await expect(registerUser({ ...validRegisterInput, role: "INVALID" }))
        .rejects.toMatchObject({ status: 400, message: expect.stringContaining("valid role") });
    });

    // FR1: duplicate email check before creating
    it("throws 409 when email already exists (FR1)", async () => {
      vi.mocked(authRepo.findUserByEmail).mockResolvedValue({ id: "existing" } as any);
      await expect(registerUser(validRegisterInput))
        .rejects.toMatchObject({ status: 409, message: expect.stringContaining("already exists") });
    });

    // NFR1: password is hashed before being passed to the repository
    it("hashes the password before saving (NFR1)", async () => {
      vi.mocked(authRepo.findUserByEmail).mockResolvedValue(null);
      vi.mocked(authRepo.createUser).mockResolvedValue({
        id: "new-id", fullName: "Test User", email: "test@example.com",
        role: "STUDENT", createdAt: new Date(),
      } as any);
      await registerUser(validRegisterInput);
      expect(bcrypt.hash).toHaveBeenCalledWith("password123", 10);
      expect(authRepo.createUser).toHaveBeenCalledWith(
        expect.objectContaining({ password: "hashed-password" })
      );
    });

    // FR1 happy path: returns safe user fields (no password hash)
    it("returns user fields without password on success (FR1)", async () => {
      vi.mocked(authRepo.findUserByEmail).mockResolvedValue(null);
      vi.mocked(authRepo.createUser).mockResolvedValue({
        id: "new-id", fullName: "Test User", email: "test@example.com",
        role: "STUDENT", createdAt: new Date(),
      } as any);
      const result = await registerUser(validRegisterInput);
      expect(result).toMatchObject({ id: "new-id", email: "test@example.com" });
      expect(result).not.toHaveProperty("password");
    });

    // NFR4: email is normalised to lowercase before duplicate check
    it("lowercases and trims email before saving (NFR4)", async () => {
      vi.mocked(authRepo.findUserByEmail).mockResolvedValue(null);
      vi.mocked(authRepo.createUser).mockResolvedValue({
        id: "u1", fullName: "Test User", email: "test@example.com",
        role: "STUDENT", createdAt: new Date(),
      } as any);
      await registerUser({ ...validRegisterInput, email: "  TEST@EXAMPLE.COM  " });
      expect(authRepo.findUserByEmail).toHaveBeenCalledWith("test@example.com");
    });
  });

  // ── loginUser (FR2 + NFR1 + NFR4) ────────────────────────────────────────
  describe("loginUser (FR2 + NFR1 + NFR4)", () => {
    // NFR4: email required
    it("throws 400 when email is missing (NFR4)", async () => {
      await expect(loginUser({ password: "pass1234" }))
        .rejects.toMatchObject({ status: 400, message: "Email is required." });
    });

    // NFR4: password required
    it("throws 400 when password is missing (NFR4)", async () => {
      await expect(loginUser({ email: "a@b.com" }))
        .rejects.toMatchObject({ status: 400, message: "Password is required." });
    });

    // FR2: vague error to prevent user enumeration
    it("throws 401 with vague message when user not found (FR2)", async () => {
      vi.mocked(authRepo.findUserByEmail).mockResolvedValue(null);
      await expect(loginUser({ email: "no@one.com", password: "pass1234" }))
        .rejects.toMatchObject({ status: 401, message: "Invalid email or password." });
    });

    // FR2: wrong password
    it("throws 401 when password does not match (FR2)", async () => {
      vi.mocked(authRepo.findUserByEmail).mockResolvedValue({
        id: "u1", email: "a@b.com", password: "hash", role: "STUDENT", fullName: "A",
      } as any);
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);
      await expect(loginUser({ email: "a@b.com", password: "wrong" }))
        .rejects.toMatchObject({ status: 401 });
    });

    // FR2 + NFR1 happy path: returns token and safe user fields
    it("returns token and user on valid credentials (FR2 + NFR1)", async () => {
      vi.mocked(authRepo.findUserByEmail).mockResolvedValue({
        id: "u1", email: "a@b.com", password: "hash", role: "STUDENT", fullName: "Alice",
      } as any);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      const result = await loginUser({ email: "a@b.com", password: "pass1234" });
      expect(result.token).toBe("mocked.jwt.token");
      expect(result.user).toMatchObject({ id: "u1", email: "a@b.com" });
      expect(result.user).not.toHaveProperty("password");
    });
  });
});
