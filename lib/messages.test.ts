import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  message: {
    create: vi.fn(),
    findMany: vi.fn(),
    updateMany: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import {
  getConversation,
  getInboxForUser,
  getSentForUser,
  listThreadsForUser,
  markMessageRead,
  markThreadRead,
  sendMessage,
} from "@/lib/messages";

describe("lib/messages.ts (messaging persistence)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sendMessage calls prisma.message.create with sender, receiver, content", async () => {
    const created = {
      id: "m1",
      content: "hello",
      senderId: "a",
      receiverId: "b",
      isRead: false,
      createdAt: new Date(),
    };
    prismaMock.message.create.mockResolvedValue(created as never);

    const result = await sendMessage({
      senderId: "a",
      receiverId: "b",
      content: "hello",
    });

    expect(prismaMock.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { senderId: "a", receiverId: "b", content: "hello" },
      })
    );
    expect(result).toEqual(created);
  });

  it("getInboxForUser queries by receiverId", async () => {
    prismaMock.message.findMany.mockResolvedValue([]);
    await getInboxForUser("user-1", 10);
    expect(prismaMock.message.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { receiverId: "user-1" },
        take: 10,
      })
    );
  });

  it("getSentForUser queries by senderId", async () => {
    prismaMock.message.findMany.mockResolvedValue([]);
    await getSentForUser("user-1");
    expect(prismaMock.message.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { senderId: "user-1" },
        take: 50,
      })
    );
  });

  it("getConversation uses OR for both directions", async () => {
    prismaMock.message.findMany.mockResolvedValue([]);
    await getConversation("a", "b", 50);
    expect(prismaMock.message.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { senderId: "a", receiverId: "b" },
            { senderId: "b", receiverId: "a" },
          ],
        },
        take: 50,
      })
    );
  });

  it("markMessageRead updates only when id and receiver match", async () => {
    prismaMock.message.updateMany.mockResolvedValue({ count: 1 } as never);
    await markMessageRead("mid", "reader");
    expect(prismaMock.message.updateMany).toHaveBeenCalledWith({
      where: { id: "mid", receiverId: "reader" },
      data: { isRead: true },
    });
  });

  it("markThreadRead marks unread from peer to reader", async () => {
    prismaMock.message.updateMany.mockResolvedValue({ count: 2 } as never);
    await markThreadRead("reader", "peer");
    expect(prismaMock.message.updateMany).toHaveBeenCalledWith({
      where: { receiverId: "reader", senderId: "peer", isRead: false },
      data: { isRead: true },
    });
  });

  it("listThreadsForUser aggregates peers, preview, unread, sorts by last activity", async () => {
    const peer = { id: "p1", fullName: "Peer", email: "p@test.com" };
    const me = { id: "me", fullName: "Me", email: "me@test.com" };
    prismaMock.message.findMany.mockResolvedValue([
      {
        id: "1",
        senderId: "me",
        receiverId: "p1",
        content: "first",
        createdAt: new Date("2024-01-01T10:00:00Z"),
        isRead: true,
        sender: me,
        receiver: peer,
      },
      {
        id: "2",
        senderId: "p1",
        receiverId: "me",
        content: "reply unread",
        createdAt: new Date("2024-01-02T10:00:00Z"),
        isRead: false,
        sender: peer,
        receiver: me,
      },
    ] as never);

    const threads = await listThreadsForUser("me");

    expect(threads).toHaveLength(1);
    expect(threads[0].peer.id).toBe("p1");
    expect(threads[0].unread).toBe(1);
    expect(threads[0].preview).toBe("reply unread".slice(0, 120));
    expect(threads[0].lastAt).toBe(new Date("2024-01-02T10:00:00Z").toISOString());
  });
});
