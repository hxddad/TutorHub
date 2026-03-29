// lib/services/messageService.test.ts
// Unit tests for messageService (FR10, FR11, NFR4)
// Layer: Service — messageRepository is mocked; no real DB touched

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/repositories/messageRepository", () => ({
  findUserById:      vi.fn(),
  getThreads:        vi.fn(),
  getConversationBetween: vi.fn(),
  markRead:          vi.fn(),
  createMessage:     vi.fn(),
  searchUsers:       vi.fn(),
}));

import * as messageRepo from "@/lib/repositories/messageRepository";
import { getThreads, getConversationWithPeer, postMessage, listAvailableMessageUsers } from "./messageService";

describe("messageService", () => {
  beforeEach(() => vi.clearAllMocks());

  // ── getThreads (FR10) ─────────────────────────────────────────────────────
  describe("getThreads (FR10)", () => {
    it("delegates to messageRepository.getThreads with the caller's ID", async () => {
      vi.mocked(messageRepo.getThreads).mockResolvedValue([]);
      await getThreads("user-1");
      expect(messageRepo.getThreads).toHaveBeenCalledWith("user-1");
    });
  });

  // ── getConversationWithPeer (FR10 + NFR4) ─────────────────────────────────
  describe("getConversationWithPeer (FR10 + NFR4)", () => {
    // NFR4: self-messaging is always blocked
    it("throws 400 when user tries to message themselves (NFR4)", async () => {
      await expect(getConversationWithPeer("user-1", "user-1"))
        .rejects.toMatchObject({ status: 400, message: "Cannot message yourself" });
    });

    it("throws 404 when the peer does not exist", async () => {
      vi.mocked(messageRepo.findUserById).mockResolvedValue(null);
      await expect(getConversationWithPeer("user-1", "user-2"))
        .rejects.toMatchObject({ status: 404 });
    });

    it("returns peer and messages when peer is found (FR10)", async () => {
      vi.mocked(messageRepo.findUserById).mockResolvedValue(
        { id: "user-2", fullName: "Bob", email: "b@t.com" }
      );
      vi.mocked(messageRepo.getConversationBetween).mockResolvedValue([]);
      vi.mocked(messageRepo.markRead).mockResolvedValue(undefined as any);

      const result = await getConversationWithPeer("user-1", "user-2");
      expect(result.peer.id).toBe("user-2");
      expect(messageRepo.markRead).toHaveBeenCalledWith("user-1", "user-2");
    });
  });

  // ── listAvailableMessageUsers (FR10 + NFR2) ───────────────────────────────
  describe("listAvailableMessageUsers (FR10 + NFR2)", () => {
    it("delegates to searchUsers with requesterId and query (FR10 + NFR2)", async () => {
      vi.mocked(messageRepo.searchUsers).mockResolvedValue([
        { id: "u2", fullName: "Bob", email: "b@test.com", role: "TUTOR" } as any,
      ]);
      const result = await listAvailableMessageUsers("caller-id", "Bob");
      expect(messageRepo.searchUsers).toHaveBeenCalledWith("caller-id", "Bob");
      expect(result).toHaveLength(1);
    });
  });

  // ── postMessage (FR11 + NFR4) ─────────────────────────────────────────────
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
      vi.mocked(messageRepo.findUserById).mockResolvedValue(null);
      await expect(postMessage("user-1", { receiverId: "ghost", content: "Hi" }))
        .rejects.toMatchObject({ status: 404 });
    });

    it("creates message when all inputs are valid (FR11)", async () => {
      vi.mocked(messageRepo.findUserById).mockResolvedValue({ id: "user-2" } as any);
      vi.mocked(messageRepo.createMessage).mockResolvedValue({
        id: "msg-1", content: "Hi", senderId: "user-1", receiverId: "user-2",
        isRead: false, createdAt: new Date(),
      } as any);

      const result = await postMessage("user-1", { receiverId: "user-2", content: "Hi" });
      expect(messageRepo.createMessage).toHaveBeenCalledWith("user-1", "user-2", "Hi");
      expect(result).toMatchObject({ content: "Hi" });
    });
  });
});
