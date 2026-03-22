import { prisma } from "@/lib/prisma";

/** Create a message (sender → receiver). */
export async function sendMessage(input: {
  senderId: string;
  receiverId: string;
  content: string;
}) {
  return prisma.message.create({
    data: {
      senderId: input.senderId,
      receiverId: input.receiverId,
      content: input.content,
    },
    include: {
      sender: { select: { id: true, fullName: true, email: true } },
      receiver: { select: { id: true, fullName: true, email: true } },
    },
  });
}

/** Inbox for a user (newest first). */
export async function getInboxForUser(userId: string, take = 50) {
  return prisma.message.findMany({
    where: { receiverId: userId },
    orderBy: { createdAt: "desc" },
    take,
    include: {
      sender: { select: { id: true, fullName: true, email: true } },
    },
  });
}

/** Sent messages for a user (newest first). */
export async function getSentForUser(userId: string, take = 50) {
  return prisma.message.findMany({
    where: { senderId: userId },
    orderBy: { createdAt: "desc" },
    take,
    include: {
      receiver: { select: { id: true, fullName: true, email: true } },
    },
  });
}

/** Thread between two users (chronological). */
export async function getConversation(userAId: string, userBId: string, take = 100) {
  return prisma.message.findMany({
    where: {
      OR: [
        { senderId: userAId, receiverId: userBId },
        { senderId: userBId, receiverId: userAId },
      ],
    },
    orderBy: { createdAt: "asc" },
    take,
    include: {
      sender: { select: { id: true, fullName: true } },
      receiver: { select: { id: true, fullName: true } },
    },
  });
}

/** Mark one message as read (typically by receiver). */
export async function markMessageRead(messageId: string, readerUserId: string) {
  return prisma.message.updateMany({
    where: {
      id: messageId,
      receiverId: readerUserId,
    },
    data: { isRead: true },
  });
}

export type ThreadSummary = {
  peer: { id: string; fullName: string; email: string };
  lastAt: string;
  preview: string;
  unread: number;
};

/** One row per person you’ve exchanged messages with, newest activity first. */
export async function listThreadsForUser(userId: string): Promise<ThreadSummary[]> {
  const messages = await prisma.message.findMany({
    where: {
      OR: [{ senderId: userId }, { receiverId: userId }],
    },
    orderBy: { createdAt: "asc" },
    take: 500,
    include: {
      sender: { select: { id: true, fullName: true, email: true } },
      receiver: { select: { id: true, fullName: true, email: true } },
    },
  });

  const map = new Map<
    string,
    { peer: { id: string; fullName: string; email: string }; lastAt: Date; preview: string; unread: number }
  >();

  for (const m of messages) {
    const imSender = m.senderId === userId;
    const peer = imSender ? m.receiver : m.sender;
    const cur = map.get(peer.id) ?? {
      peer,
      lastAt: m.createdAt,
      preview: m.content.slice(0, 120),
      unread: 0,
    };
    cur.lastAt = m.createdAt;
    cur.preview = m.content.slice(0, 120);
    if (!imSender && !m.isRead) cur.unread += 1;
    map.set(peer.id, cur);
  }

  return Array.from(map.values())
    .sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime())
    .map((t) => ({
      peer: t.peer,
      lastAt: t.lastAt.toISOString(),
      preview: t.preview,
      unread: t.unread,
    }));
}

/** Mark all messages from peer → current user as read. */
export async function markThreadRead(readerUserId: string, peerId: string) {
  return prisma.message.updateMany({
    where: {
      receiverId: readerUserId,
      senderId: peerId,
      isRead: false,
    },
    data: { isRead: true },
  });
}
