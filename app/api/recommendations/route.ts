import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const payload = requireAuth(req);
  if (payload instanceof Response) return payload;

  const studentId = payload.sub;

  try {
    const res = await fetch(`http://localhost:8000/recommendations/${studentId}`, {
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch recommendations" }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);

  } catch {
    return NextResponse.json(
      { error: "Recommendation service unavailable" },
      { status: 503 }
    );
  }
}