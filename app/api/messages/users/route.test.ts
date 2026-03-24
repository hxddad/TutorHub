import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  user: { findMany: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { signToken } from "@/lib/jwt";
import { GET } from "./route";

const ME = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

describe("GET /api/messages/users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without auth", async () => {
    const res = await GET(new Request("http://localhost/api/messages/users"));
    expect(res.status).toBe(401);
  });

  it("returns user list for search", async () => {
    prismaMock.user.findMany.mockResolvedValue([
      { id: "u2", fullName: "Bob", email: "b@test.com", role: "TUTOR" },
    ] as never);

    const token = signToken(ME, "STUDENT");
    const req = new Request("http://localhost/api/messages/users?q=bo", {
      headers: { authorization: `Bearer ${token}` },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.users).toHaveLength(1);
    expect(prismaMock.user.findMany).toHaveBeenCalled();
  });
});
