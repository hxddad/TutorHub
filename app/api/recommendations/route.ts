// app/api/recommendations/route.ts
// FR11 (tutor recommendations), NFR1 (auth), NFR15 (thin route)
// All external service interaction is delegated to recommendationGateway

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";
import * as recommendationGateway from "@/lib/gateways/recommendationGateway";

// FR11 + NFR1 - authenticated user gets recommendations from the Python service
// student ID comes from the JWT, never from the query string (NFR2)
export async function GET(req: NextRequest) {
  // NFR1 - must be logged in
  const auth = requireAuth(req);
  if (isAuthError(auth)) return auth;

  try {
    const data = await recommendationGateway.getRecommendationsForStudent(auth.sub);
    return NextResponse.json(data);
  } catch (err: any) {
    if (err?.status) return NextResponse.json({ error: err.message }, { status: err.status });
    // NFR8 - graceful degradation if the recommendation service is down
    console.error("GET /api/recommendations error:", err);
    return NextResponse.json({ error: "Recommendation service unavailable" }, { status: 503 });
  }
}
