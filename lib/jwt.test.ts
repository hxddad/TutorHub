import { describe, expect, it } from "vitest";
import { signToken, verifyToken } from "@/lib/jwt";
import { FIXTURE_ROLE, FIXTURE_USER_ID } from "@/tests/fixtures/auth";

describe("signToken / verifyToken (FR: authentication / JWT session)", () => {
  it("signs and verifies a token with sub and role", () => {
    const token = signToken(FIXTURE_USER_ID, FIXTURE_ROLE);
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3);

    const payload = verifyToken(token);
    expect(payload).not.toBeNull();
    expect(payload!.sub).toBe(FIXTURE_USER_ID);
    expect(payload!.role).toBe(FIXTURE_ROLE);
  });

  it("returns null for malformed token", () => {
    expect(verifyToken("not-a-jwt")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(verifyToken("")).toBeNull();
  });
});
