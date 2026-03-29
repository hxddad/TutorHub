// app/api/messages/users/route.test.ts
// Integration tests for GET /api/messages/users
// Layer: Route handler — messageService is mocked; we test HTTP concerns only
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/services/messageService", () => ({
  listAvailableMessageUsers: vi.fn(),
}));

import * as messageService from "@/lib/services/messageService";
import { signToken } from "@/lib/jwt";
import { GET } from "./route";

const ME = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

describe("GET /api/messages/users", () => {
  beforeEach(() => vi.clearAllMocks());

  // NFR1: no token → 401
  it("returns 401 without auth (NFR1)", async () => {
    const res = await GET(new Request("http://localhost/api/messages/users"));
    expect(res.status).toBe(401);
  });

  // FR10 happy path: authenticated user gets user list from messageService
  it("returns user list from messageService (FR10)", async () => {
    vi.mocked(messageService.listAvailableMessageUsers).mockResolvedValue([
      { id: "u2", fullName: "Bob", email: "b@test.com", role: "TUTOR" },
    ] as any);

    const token = signToken(ME, "STUDENT");
    const req = new Request("http://localhost/api/messages/users?q=bo", {
      headers: { authorization: `Bearer ${token}` },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.users).toHaveLength(1);
    // NFR2: caller's ID is passed so service can exclude them from results
    expect(messageService.listAvailableMessageUsers).toHaveBeenCalledWith(ME, "bo");
  });

  // NFR15: route never calls repository directly — delegates to messageService
  it("returns 500 when messageService throws (NFR15)", async () => {
    vi.mocked(messageService.listAvailableMessageUsers).mockRejectedValue(new Error("DB down"));
    const token = signToken(ME, "STUDENT");
    const req = new Request("http://localhost/api/messages/users", {
      headers: { authorization: `Bearer ${token}` },
    });
    const res = await GET(req);
    expect(res.status).toBe(500);
  });
});
