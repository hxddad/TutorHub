// app/api/messages/users/route.ts
// User search for the "start a conversation" UI
// FR10 (message user search), NFR1 (auth), NFR2 (excludes self)
// Route handles request/response only — DB access via messageRepository

import { NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";
import { searchUsers } from "@/lib/repositories/messageRepository";

// FR10 + NFR1 + NFR2 - search for users to message; self is always excluded
export async function GET(request: Request) {
  // NFR1 - must be logged in
  const auth = requireAuth(request);
  if (isAuthError(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();

  try {
    // NFR2 - auth.sub is excluded from results so user can't message themselves
    const users = await searchUsers(auth.sub, q);
    return NextResponse.json({ users });
  } catch (err) {
    console.error("GET /api/messages/users", err);
    return NextResponse.json({ error: "Failed to load users" }, { status: 500 });
  }
}
