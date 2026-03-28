// lib/validators/messagingValidator.ts
// NFR4 - validates message sending inputs

export interface MessageInput {
  receiverId?: unknown;
  content?: unknown;
}

// NFR4 - receiverId must be a non-empty string; content must be non-empty and under 8000 chars
export function validateMessageInput(body: MessageInput): string | null {
  if (!body.receiverId || typeof body.receiverId !== "string") {
    return "receiverId is required";
  }
  const content = (body.content ?? "").toString().trim();
  if (!content) return "content is required";
  if (content.length > 8000) return "content must be 8000 characters or fewer";
  return null;
}
