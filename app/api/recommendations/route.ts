// app/api/recommendations/route.ts
// Proxies tutor recommendations from the Python recommendation service
// FR11 (tutor recommendations), NFR1 (auth)

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";

// FR15 + NFR1 — only logged-in users can get recommendations
// the student's ID comes from their JWT, not from the query string
export async function GET(req: NextRequest) {
  // NFR1 — must be logged in
  const auth = requireAuth(req);
  if (isAuthError(auth)) return auth;

  // FR11 — forward the request to the Python recommendation service
  // using auth.sub (from the JWT) so the service gets the real student ID
  try {
    const res = await fetch(`http://localhost:8000/recommendations/${auth.sub}`, {
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch recommendations" }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    // NFR — graceful degradation if the recommendation service is down
    return NextResponse.json(
      { error: "Recommendation service unavailable" },
      { status: 503 }
    );
  }
}
