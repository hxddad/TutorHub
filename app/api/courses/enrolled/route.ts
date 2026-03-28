// app/api/courses/enrolled/route.ts
// FR6 - returns the courses the logged-in student is actively enrolled in; NFR1, NFR2
// Route handles request/response only — uses courseService

import { NextResponse } from "next/server";
import { requireStudent, isAuthError } from "@/lib/api-auth";
import * as courseService from "@/lib/services/courseService";

// FR6 + NFR1 + NFR2 - only the logged-in student's own enrolled courses
// identity comes from the JWT; any studentId query param is ignored
export async function GET(request: Request) {
  try {
    const auth = requireStudent(request);
    if (isAuthError(auth)) return auth;

    const courses = await courseService.listEnrolledCourses(auth.sub);
    return NextResponse.json(courses);
  } catch (err: any) {
    if (err?.status) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("GET /api/courses/enrolled error:", err);
    return NextResponse.json({ error: "Failed to fetch enrolled courses" }, { status: 500 });
  }
}
