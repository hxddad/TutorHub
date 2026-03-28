// app/api/courses/mine/route.ts
// FR5 - tutor's dashboard course list; NFR1, NFR2
// Route handles request/response only — uses courseService

import { NextResponse } from "next/server";
import { requireTutor, isAuthError } from "@/lib/api-auth";
import * as courseService from "@/lib/services/courseService";

// FR5 + NFR1 + NFR2 - return compact summary of the logged-in tutor's courses
export async function GET(request: Request) {
  try {
    const auth = requireTutor(request);
    if (isAuthError(auth)) return auth;

    const courses = await courseService.listTutorCoursesSummary(auth.sub);
    return NextResponse.json(courses);
  } catch (err: any) {
    if (err?.status) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("GET /api/courses/mine error:", err);
    return NextResponse.json({ error: "Failed to fetch courses" }, { status: 500 });
  }
}
