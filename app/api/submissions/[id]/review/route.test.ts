import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  submission: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { signToken } from "@/lib/jwt";
import { PATCH } from "./route";

const TUTOR = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

describe("PATCH /api/submissions/[id]/review", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 for non-tutor", async () => {
    const req = new Request("http://localhost/api/submissions/1/review", {
      method: "PATCH",
      headers: {
        authorization: `Bearer ${signToken("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "STUDENT")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ grade: 85, feedback: "Good" }),
    });
    const res = await PATCH(req, { params: { id: "1" } });
    expect(res.status).toBe(403);
  });

  it("returns 404 when submission missing", async () => {
    prismaMock.submission.findUnique.mockResolvedValue(null);
    const req = new Request("http://localhost/api/submissions/99/review", {
      method: "PATCH",
      headers: {
        authorization: `Bearer ${signToken(TUTOR, "TUTOR")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ grade: 90 }),
    });
    const res = await PATCH(req, { params: { id: "99" } });
    expect(res.status).toBe(404);
  });

  it("returns 403 when tutor does not own course", async () => {
    prismaMock.submission.findUnique.mockResolvedValue({
      id: 1,
      assignment: { course: { tutorId: "other" } },
    } as never);

    const req = new Request("http://localhost/api/submissions/1/review", {
      method: "PATCH",
      headers: {
        authorization: `Bearer ${signToken(TUTOR, "TUTOR")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ grade: 80 }),
    });
    const res = await PATCH(req, { params: { id: "1" } });
    expect(res.status).toBe(403);
  });

  it("updates grade and feedback when tutor owns course", async () => {
    prismaMock.submission.findUnique.mockResolvedValue({
      id: 1,
      assignment: { course: { tutorId: TUTOR } },
    } as never);
    prismaMock.submission.update.mockResolvedValue({
      id: 1,
      grade: 88,
      feedback: "Nice",
    } as never);

    const req = new Request("http://localhost/api/submissions/1/review", {
      method: "PATCH",
      headers: {
        authorization: `Bearer ${signToken(TUTOR, "TUTOR")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ grade: 88, feedback: "Nice" }),
    });
    const res = await PATCH(req, { params: { id: "1" } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
