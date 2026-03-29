// lib/services/messageService.ts
// Business logic for messaging — no direct Prisma imports; uses messageRepository only
// NFR15 (clean service boundary)

import * as messageRepo from "@/lib/repositories/messageRepository";
import { validateMessageInput } from "@/lib/validators/messagingValidator";

// FR10 - get all message threads for the logged-in user
export async function getThreads(userId: string) {
  return messageRepo.getThreads(userId);
}

// FR10 - get the full conversation between two users and mark incoming as read
export async function getConversationWithPeer(userId: string, peerId: string) {
  // NFR4 - can't open a conversation with yourself
  if (userId === peerId) throw { status: 400, message: "Cannot message yourself" };

  const peer = await messageRepo.findUserById(peerId);
  if (!peer) throw { status: 404, message: "User not found" };

  const messages = await messageRepo.getConversationBetween(userId, peerId);
  await messageRepo.markRead(userId, peerId);

  return { peer, messages };
}

// FR10 + NFR2 - search for users available to message; caller is excluded from results
export async function listAvailableMessageUsers(requesterId: string, query: string) {
  return messageRepo.searchUsers(requesterId, query);
}

// FR11 + NFR4 - validate then send a message
export async function postMessage(senderId: string, body: any) {
  // NFR4 - check receiverId and content are valid
  const validationError = validateMessageInput(body);
  if (validationError) throw { status: 400, message: validationError };

  const receiverId = body.receiverId.trim();
  const content = body.content.trim();

  // NFR4 - can't message yourself
  if (receiverId === senderId) throw { status: 400, message: "Cannot message yourself" };

  const receiver = await messageRepo.findUserById(receiverId);
  if (!receiver) throw { status: 404, message: "Receiver not found" };

  return messageRepo.createMessage(senderId, receiverId, content);
}
