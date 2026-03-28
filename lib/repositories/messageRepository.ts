// lib/repositories/messageRepository.ts
// All Prisma calls for messaging live here — messageService never imports prisma directly
// NFR15 (maintainability), NFR13 (testability)

import { prisma } from "@/lib/prisma";
import {
  getConversation,
  listThreadsForUser,
  markThreadRead,
  sendMessage,
} from "@/lib/messages";

// FR10/FR11 - look up a user by id (used to validate receiver/peer exists)
export async function findUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, fullName: true, email: true },
  });
}

// FR10 - get all threads for a user (delegates to lib/messages helper)
export async function getThreads(userId: string) {
  return listThreadsForUser(userId);
}

// FR10 - get the conversation between two users (delegates to lib/messages helper)
export async function getConversationBetween(userAId: string, userBId: string) {
  return getConversation(userAId, userBId, 200);
}

// FR10 - mark all messages from peer as read when the recipient opens the thread
export async function markRead(readerUserId: string, peerId: string) {
  return markThreadRead(readerUserId, peerId);
}

// FR11 - create a new message
export async function createMessage(senderId: string, receiverId: string, content: string) {
  return sendMessage({ senderId, receiverId, content });
}

// FR10 - search for users by name or email (for the "start a conversation" UI)
// excludes the caller from results so you can't message yourself
export async function searchUsers(excludeId: string, query: string) {
  return prisma.user.findMany({
    where: {
      id: { not: excludeId },
      ...(query
        ? {
            OR: [
              { fullName: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: { id: true, fullName: true, email: true, role: true },
    take: 30,
    orderBy: { fullName: "asc" },
  });
}
