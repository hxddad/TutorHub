// app/api/messages/route.ts
// Direct messaging between users
// FR10 (open/view threads), FR11 (send messages), NFR1 (auth), NFR4 (validation)

import { NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";
import * as messageService from "@/lib/services/messageService";

// FR10 + NFR1 - get message threads or a specific conversation
// GET /api/messages           → all threads for logged-in user
// GET /api/messages?with=uuid → conversation with a specific user
export async function GET(request: Request) {
  // NFR1 - must be logged in to access messages
  const auth = requireAuth(request);
  if (isAuthError(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const withUserId = searchParams.get("with")?.trim();

  try {
    if (withUserId) {
      // FR10 - fetch the conversation and mark incoming messages as read
      const { peer, messages } = await messageService.getConversationWithPeer(auth.sub, withUserId);
      return NextResponse.json({
        peer: { id: peer.id, fullName: peer.fullName, email: peer.email },
        messages: messages.map((m) => ({
          id: m.id,
          content: m.content,
          createdAt: m.createdAt.toISOString(),
          isRead: m.isRead,
          senderId: m.senderId,
          receiverId: m.receiverId,
        })),
      });
    }

    // FR10 - return all threads for this user
    const threads = await messageService.getThreads(auth.sub);
    return NextResponse.json({ threads });
  } catch (err: any) {
    if (err?.status) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("GET /api/messages", err);
    return NextResponse.json({ error: "Failed to load messages" }, { status: 500 });
  }
}

// FR11 + NFR1 + NFR4 - send a message to another user
// body: { receiverId, content }
export async function POST(request: Request) {
  // NFR1 - must be logged in to send messages
  const auth = requireAuth(request);
  if (isAuthError(auth)) return auth;

  try {
    const body = await request.json().catch(() => ({}));

    // NFR4 - messageService validates receiverId and content before sending
    const message = await messageService.postMessage(auth.sub, body);

    return NextResponse.json({
      message: {
        id: message.id,
        content: message.content,
        createdAt: message.createdAt.toISOString(),
        isRead: message.isRead,
        senderId: message.senderId,
        receiverId: message.receiverId,
      },
    });
  } catch (err: any) {
    if (err?.status) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("POST /api/messages", err);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
