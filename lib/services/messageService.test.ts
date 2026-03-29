// lib/services/messageService.test.ts
// Unit tests for messageService (FR10, FR11, NFR4)

import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

vi.mock("@/lib/messages", () => ({
  sendMessage: vi.fn(),
  getConversation: vi.fn(),
  listThreadsForUser: vi.fn(),
  markThreadRead: vi.fn(),
}));

import * as messages from "@/lib/messages";
import { getThreads, getConversationWithPeer, postMessage, listAvailableMessageUsers } from "./messageService";

describe("messageService", () => {
  beforeEach(() => vi.clearAllMocks());

  // ── getThreads ────────────────────────────────────────────────────────────
  describe("getThreads (FR10)", () => {
    it("delegates to listThreadsForUser with the caller's ID", async () => {
      vi.mocked(messages.listThreadsForUser).mockResolvedValue([]);
      await getThreads("user-1");
      expect(messages.listThreadsForUser).toHaveBeenCalledWith("user-1");
    });
  });

  // ── getConversationWithPeer ────────────────────────────────────────────────
  describe("getConversationWithPeer (FR10 + NFR4)", () => {
    it("throws 400 when user tries to message themselves (NFR4)", async () => {
      await expect(getConversationWithPeer("user-1", "user-1"))
        .rejects.toMatchObject({ status: 400, message: "Cannot message yourself" });
    });

    it("throws 404 when the peer does not exist", async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      await expect(getConversationWithPeer("user-1", "user-2"))
        .rejects.toMatchObject({ status: 404 });
    });

    it("returns peer and messages when valid", async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: "user-2", fullName: "Bob", email: "b@t.com" });
      vi.mocked(messages.getConversation).mockResolvedValue([]);
      vi.mocked(messages.markThreadRead).mockResolvedValue(undefined as any);

      const result = await getConversationWithPeer("user-1", "user-2");
      expect(result.peer.id).toBe("user-2");
      expect(messages.markThreadRead).toHaveBeenCalledWith("user-1", "user-2");
    });
  });

  // ── listAvailableMessageUsers ─────────────────────────────────────────────
  describe("listAvailableMessageUsers (FR10 + NFR2)", () => {
    // FR10: delegates search to repository with caller excluded
    it("delegates to searchUsers with requesterId and query (FR10 + NFR2)", async () => {
      prismaMock.user.findUnique.mockResolvedValue(null); // not called but reset for clarity
      // searchUsers lives in messageRepository which uses prisma.user.findMany
      // We verify the service passes through args correctly by checking the call shape
      // Full DB behaviour is tested at the repository layer
      const findManySpy = vi.fn().mockResolvedValue([
        { id: "u2", fullName: "Bob", email: "b@test.com", role: "TUTOR" },
      ]);
      // Patch prisma mock with findMany for this test
      (prismaMock as any).user.findMany = findManySpy;

      const result = await listAvailableMessageUsers("caller-id", "Bob");
      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ id: { not: "caller-id" } }) })
      );
      expect(result).toHaveLength(1);
    });
  });

  // ── postMessage ───────────────────────────────────────────────────────────
  describe("postMessage (FR11 + NFR4)", () => {
    it("throws 400 when receiverId is missing (NFR4)", async () => {
      await expect(postMessage("user-1", { content: "Hi" }))
        .rejects.toMatchObject({ status: 400 });
    });

    it("throws 400 when content is empty (NFR4)", async () => {
      await expect(postMessage("user-1", { receiverId: "user-2", content: "" }))
        .rejects.toMatchObject({ status: 400 });
    });

    it("throws 400 when sender and receiver are the same (NFR4)", async () => {
      await expect(postMessage("user-1", { receiverId: "user-1", content: "Hi" }))
        .rejects.toMatchObject({ status: 400, message: "Cannot message yourself" });
    });

    it("throws 404 when receiver does not exist", async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      await expect(postMessage("user-1", { receiverId: "ghost", content: "Hi" }))
        .rejects.toMatchObject({ status: 404 });
    });

    it("sends message when all inputs are valid (FR11)", async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: "user-2" });
      vi.mocked(messages.sendMessage).mockResolvedValue({
        id: "msg-1", content: "Hi", senderId: "user-1", receiverId: "user-2",
        isRead: false, createdAt: new Date(),
      } as any);

      const result = await postMessage("user-1", { receiverId: "user-2", content: "Hi" });
      expect(messages.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ senderId: "user-1", receiverId: "user-2", content: "Hi" })
      );
      expect(result).toMatchObject({ content: "Hi" });
    });
  });
});
