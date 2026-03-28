// lib/repositories/messageRepository.test.ts
// Tests for the message repository (user lookups and message operations)
// NFR13 - all Prisma and lib/messages calls are mocked

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the prisma client used directly by the repo (for user lookup and user search)
const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), findMany: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

// Mock the lib/messages helpers that the repo delegates to
vi.mock("@/lib/messages", () => ({
  getConversation: vi.fn(),
  listThreadsForUser: vi.fn(),
  markThreadRead: vi.fn(),
  sendMessage: vi.fn(),
}));

import * as messages from "@/lib/messages";
import {
  findUserById,
  getThreads,
  getConversationBetween,
  markRead,
  createMessage,
  searchUsers,
} from "./messageRepository";

describe("messageRepository", () => {
  beforeEach(() => vi.clearAllMocks());

  // FR10 - finding a user before opening or sending in a conversation
  describe("findUserById", () => {
    it("returns the user with id, fullName, and email", async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: "u1", fullName: "Alice", email: "a@t.com" });

      const result = await findUserById("u1");

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: "u1" },
        select: { id: true, fullName: true, email: true },
      });
      expect(result?.fullName).toBe("Alice");
    });

    it("returns null when the user does not exist", async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      expect(await findUserById("ghost")).toBeNull();
    });
  });

  // FR10 - getting the thread list for the messages inbox
  describe("getThreads", () => {
    it("delegates to listThreadsForUser with the correct userId", async () => {
      vi.mocked(messages.listThreadsForUser).mockResolvedValue([]);

      await getThreads("user-1");

      expect(messages.listThreadsForUser).toHaveBeenCalledWith("user-1");
    });
  });

  // FR10 - opening a conversation between two users
  describe("getConversationBetween", () => {
    it("delegates to getConversation with both user IDs", async () => {
      vi.mocked(messages.getConversation).mockResolvedValue([]);

      await getConversationBetween("user-a", "user-b");

      expect(messages.getConversation).toHaveBeenCalledWith("user-a", "user-b", 200);
    });
  });

  // FR10 - marking messages as read when the user opens a thread
  describe("markRead", () => {
    it("calls markThreadRead with reader and sender IDs", async () => {
      vi.mocked(messages.markThreadRead).mockResolvedValue({ count: 3 } as any);

      await markRead("reader-id", "sender-id");

      expect(messages.markThreadRead).toHaveBeenCalledWith("reader-id", "sender-id");
    });
  });

  // FR11 - sending a new message
  describe("createMessage", () => {
    it("calls sendMessage with the correct sender, receiver, and content", async () => {
      vi.mocked(messages.sendMessage).mockResolvedValue({ id: "msg-1" } as any);

      await createMessage("sender-id", "receiver-id", "Hello!");

      expect(messages.sendMessage).toHaveBeenCalledWith({
        senderId: "sender-id",
        receiverId: "receiver-id",
        content: "Hello!",
      });
    });
  });

  // FR10 - searching for users to start a conversation with
  describe("searchUsers", () => {
    it("excludes the requesting user from results (NFR2 — can't message yourself)", async () => {
      prismaMock.user.findMany.mockResolvedValue([]);

      await searchUsers("my-id", "alice");

      // the where clause must exclude the calling user
      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: { not: "my-id" } }),
        })
      );
    });

    it("searches by name and email when a query string is provided", async () => {
      prismaMock.user.findMany.mockResolvedValue([]);

      await searchUsers("my-id", "alice");

      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ fullName: expect.any(Object) }),
              expect.objectContaining({ email: expect.any(Object) }),
            ]),
          }),
        })
      );
    });

    it("returns all users (excluding self) when no search query is given", async () => {
      prismaMock.user.findMany.mockResolvedValue([
        { id: "u2", fullName: "Bob", email: "b@t.com", role: "TUTOR" },
      ]);

      const result = await searchUsers("my-id", "");

      expect(result).toHaveLength(1);
    });
  });
});
