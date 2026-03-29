// lib/repositories/messageRepository.ts
// Tests for the message repository — all Prisma calls are mocked
// lib/messages.ts has been removed; the repository owns all messaging DB logic directly
// NFR13 (testability), NFR15 (maintainability)

import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  user:    { findUnique: vi.fn(), findMany: vi.fn() },
  message: { findMany: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

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

  // FR10 - finding a user before opening or validating a conversation
  describe("findUserById", () => {
    it("returns the user with safe fields selected", async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: "u1", fullName: "Alice", email: "a@t.com" });
      const result = await findUserById("u1");
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: "u1" },
        select: { id: true, fullName: true, email: true },
      });
      expect(result?.fullName).toBe("Alice");
    });

    it("returns null when user does not exist", async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      expect(await findUserById("ghost")).toBeNull();
    });
  });

  // FR10 - thread list for the messaging inbox
  describe("getThreads", () => {
    it("returns an empty array when user has no messages", async () => {
      prismaMock.message.findMany.mockResolvedValue([]);
      const result = await getThreads("user-1");
      expect(result).toEqual([]);
      expect(prismaMock.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ OR: expect.any(Array) }) })
      );
    });

    it("groups messages into one thread per peer and marks unread count", async () => {
      const now = new Date();
      prismaMock.message.findMany.mockResolvedValue([
        {
          id: "m1", senderId: "peer-1", receiverId: "user-1", content: "Hi",
          isRead: false, createdAt: now,
          sender:   { id: "peer-1", fullName: "Bob",   email: "b@t.com" },
          receiver: { id: "user-1", fullName: "Alice", email: "a@t.com" },
        },
      ]);
      const result = await getThreads("user-1");
      expect(result).toHaveLength(1);
      expect(result[0].peer.id).toBe("peer-1");
      expect(result[0].unread).toBe(1);
    });
  });

  // FR10 - fetching the full conversation between two users
  describe("getConversationBetween", () => {
    it("queries messages in both directions between the two users", async () => {
      prismaMock.message.findMany.mockResolvedValue([]);
      await getConversationBetween("user-a", "user-b");
      expect(prismaMock.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ OR: expect.any(Array) }),
        })
      );
    });
  });

  // FR10 - marking messages as read when the user opens a thread
  describe("markRead", () => {
    it("marks unread messages from peer to reader as read", async () => {
      prismaMock.message.updateMany.mockResolvedValue({ count: 2 });
      await markRead("reader-id", "peer-id");
      expect(prismaMock.message.updateMany).toHaveBeenCalledWith({
        where: { receiverId: "reader-id", senderId: "peer-id", isRead: false },
        data:  { isRead: true },
      });
    });
  });

  // FR11 - creating a new message
  describe("createMessage", () => {
    it("creates the message with sender and receiver included", async () => {
      prismaMock.message.create.mockResolvedValue({ id: "msg-1", content: "Hello!" } as any);
      const result = await createMessage("sender-id", "receiver-id", "Hello!");
      expect(prismaMock.message.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { senderId: "sender-id", receiverId: "receiver-id", content: "Hello!" },
        })
      );
      expect(result).toMatchObject({ id: "msg-1" });
    });
  });

  // FR10 - searching for users to start a conversation with
  describe("searchUsers", () => {
    it("excludes the requesting user from results (NFR2)", async () => {
      prismaMock.user.findMany.mockResolvedValue([]);
      await searchUsers("my-id", "alice");
      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ id: { not: "my-id" } }) })
      );
    });

    it("searches by name and email when a query is provided", async () => {
      prismaMock.user.findMany.mockResolvedValue([]);
      await searchUsers("my-id", "alice");
      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ fullName: expect.any(Object) }),
              expect.objectContaining({ email:    expect.any(Object) }),
            ]),
          }),
        })
      );
    });

    it("returns all users (excluding self) when no query is given", async () => {
      prismaMock.user.findMany.mockResolvedValue([
        { id: "u2", fullName: "Bob", email: "b@t.com", role: "TUTOR" },
      ]);
      const result = await searchUsers("my-id", "");
      expect(result).toHaveLength(1);
    });
  });
});
