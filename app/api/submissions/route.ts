// app/api/submissions/route.ts
// FR8 (submit work), NFR1, NFR2, NFR4
// Route handles request/response only — business logic lives in submissionService

import { NextResponse } from "next/server";
import { requireAuth, requireStudent, isAuthError } from "@/lib/api-auth";
import * as submissionService from "@/lib/services/submissionService";

// FR8 + NFR1 + NFR2 - get submissions (student sees own; tutor sees all for their course)
export async function GET(request: Request) {
  try {
    const auth = requireAuth(request);
    if (isAuthError(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const assignmentId = Number(searchParams.get("assignmentId") || 0);
    const courseId = Number(searchParams.get("courseId") || 0);

    const submissions = await submissionService.listSubmissions(
      auth.sub, auth.role, assignmentId, courseId
    );
    return NextResponse.json(submissions);
  } catch (err: any) {
    if (err?.status) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("GET /api/submissions error:", err);
    return NextResponse.json({ error: "Failed to fetch submissions" }, { status: 500 });
  }
}

// FR8 + NFR1 + NFR2 + NFR4 - student submits work (handles resubmit too)
export async function POST(request: Request) {
  try {
    // NFR2 - only students can submit
    const auth = requireStudent(request);
    if (isAuthError(auth)) return auth;

    const body = await request.json().catch(() => ({}));
    const { submission, resubmitted } = await submissionService.submitWork(auth.sub, body);
    return NextResponse.json({ success: true, submission, resubmitted }, {
      status: resubmitted ? 200 : 201,
    });
  } catch (err: any) {
    if (err?.status) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("POST /api/submissions error:", err);
    return NextResponse.json({ error: "Failed to submit" }, { status: 500 });
  }
}
