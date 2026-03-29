// lib/repositories/messageRepository.ts
// All Prisma calls for messaging live here — messageService never imports prisma directly
// lib/messages.ts has been absorbed into this file to complete the layered architecture
// NFR15 (maintainability), NFR13 (testability)

import { prisma } from "@/lib/prisma";

export type ThreadSummary = {
  peer: { id: string; fullName: string; email: string };
  lastAt: string;
  preview: string;
  unread: number;
};

// FR10/FR11 - look up a user by id (used to validate receiver/peer exists)
export async function findUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, fullName: true, email: true },
  });
}

// FR10 - get all threads for a user, one row per peer, newest activity first
export async function getThreads(userId: string): Promise<ThreadSummary[]> {
  const messages = await prisma.message.findMany({
    where: { OR: [{ senderId: userId }, { receiverId: userId }] },
    orderBy: { createdAt: "asc" },
    take: 500,
    include: {
      sender:   { select: { id: true, fullName: true, email: true } },
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
    const cur = map.get(peer.id) ?? { peer, lastAt: m.createdAt, preview: m.content.slice(0, 120), unread: 0 };
    cur.lastAt  = m.createdAt;
    cur.preview = m.content.slice(0, 120);
    if (!imSender && !m.isRead) cur.unread += 1;
    map.set(peer.id, cur);
  }

  return Array.from(map.values())
    .sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime())
    .map((t) => ({ peer: t.peer, lastAt: t.lastAt.toISOString(), preview: t.preview, unread: t.unread }));
}

// FR10 - get the full conversation between two users, chronological
export async function getConversationBetween(userAId: string, userBId: string) {
  return prisma.message.findMany({
    where: {
      OR: [
        { senderId: userAId, receiverId: userBId },
        { senderId: userBId, receiverId: userAId },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: 200,
    include: {
      sender:   { select: { id: true, fullName: true } },
      receiver: { select: { id: true, fullName: true } },
    },
  });
}

// FR10 - mark all messages from peer as read when the recipient opens the thread
export async function markRead(readerUserId: string, peerId: string) {
  return prisma.message.updateMany({
    where: { receiverId: readerUserId, senderId: peerId, isRead: false },
    data: { isRead: true },
  });
}

// FR11 - create a new message
export async function createMessage(senderId: string, receiverId: string, content: string) {
  return prisma.message.create({
    data: { senderId, receiverId, content },
    include: {
      sender:   { select: { id: true, fullName: true, email: true } },
      receiver: { select: { id: true, fullName: true, email: true } },
    },
  });
}

// FR10 - search for users by name or email (for the "start a conversation" UI)
// excludes the caller from results so you can't message yourself
export async function searchUsers(excludeId: string, query: string) {
  return prisma.user.findMany({
    where: {
      id: { not: excludeId },
      ...(query ? {
        OR: [
          { fullName: { contains: query, mode: "insensitive" } },
          { email:    { contains: query, mode: "insensitive" } },
        ],
      } : {}),
    },
    select: { id: true, fullName: true, email: true, role: true },
    take: 30,
    orderBy: { fullName: "asc" },
  });
}
