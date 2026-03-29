// app/api/messages/users/route.ts
// FR10 (user search for messaging), NFR1 (auth), NFR2 (excludes self)
// NFR15 (thin route — business logic delegated to messageService)

import { NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";
import * as messageService from "@/lib/services/messageService";

// FR10 + NFR1 + NFR2 - search for users to message; self is always excluded
export async function GET(request: Request) {
  // NFR1 - must be logged in
  const auth = requireAuth(request);
  if (isAuthError(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();

  try {
    const users = await messageService.listAvailableMessageUsers(auth.sub, q);
    return NextResponse.json({ users });
  } catch (err) {
    console.error("GET /api/messages/users", err);
    return NextResponse.json({ error: "Failed to load users" }, { status: 500 });
  }
}
