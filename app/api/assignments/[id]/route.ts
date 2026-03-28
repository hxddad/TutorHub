// app/api/assignments/[id]/route.ts
// FR7 (view one assignment), NFR1, NFR2
// Route handles request/response only — business logic lives in assignmentService

import { NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";
import * as assignmentService from "@/lib/services/assignmentService";

// FR7 + NFR1 + NFR2 - get one assignment (students see only their submissions)
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = requireAuth(request);
    if (isAuthError(auth)) return auth;

    const id = Number(params.id);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid assignment id" }, { status: 400 });

    const assignment = await assignmentService.getAssignment(id, auth.sub, auth.role);
    return NextResponse.json(assignment);
  } catch (err: any) {
    if (err?.status) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("GET /api/assignments/[id] error:", err);
    return NextResponse.json({ error: "Failed to fetch assignment" }, { status: 500 });
  }
}
