// app/api/study-plans/[id]/edit-data/route.ts
// Supplies everything the edit form needs in one request:
//   - the plan and its tasks
//   - the relevant course list (student's enrolled courses for students,
//     or courses taught by the tutor for tutors)
// FR13 (update study plan), NFR1, NFR2

import { NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";
import * as planRepo from "@/lib/repositories/studyPlanRepository";
import * as courseRepo from "@/lib/repositories/courseRepository";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = requireAuth(request);
    if (isAuthError(auth)) return auth;

    const planId = Number(params.id);
    if (isNaN(planId)) return NextResponse.json({ error: "Invalid plan id" }, { status: 400 });

    const plan = await planRepo.findPlanById(planId);
    if (!plan) return NextResponse.json({ error: "Study plan not found" }, { status: 404 });

    if (auth.role === "STUDENT") {
      // NFR2 - students can only load their own plan for editing
      if (plan.studentId !== auth.sub) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      // for students, course list = their enrolled courses
      const enrollments = await courseRepo.findEnrolledCourses(auth.sub);
      const courses = enrollments.map((e) => ({ id: e.course.id, title: e.course.title }));
      return NextResponse.json({ plan, courses });
    }

    if (auth.role === "TUTOR") {
      // NFR2 - tutor must teach at least one course the student is enrolled in
      const tutorCourses = await courseRepo.findCoursesByTutor(auth.sub);
      const tutorCourseIds = tutorCourses.map((c) => c.id);
      const studentEnrollments = await courseRepo.findEnrolledCourses(plan.studentId);
      const enrolledIds = studentEnrollments.map((e) => e.course.id);
      const hasSharedCourse = tutorCourseIds.some((id) => enrolledIds.includes(id));

      if (!hasSharedCourse) {
        return NextResponse.json(
          { error: "Forbidden: this student is not enrolled in any of your courses" },
          { status: 403 }
        );
      }

      // for tutors, course list = tutor's own courses (so they can assign tasks to them)
      const courses = tutorCourses.map((c) => ({ id: c.id, title: c.title }));
      return NextResponse.json({ plan, courses });
    }

    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } catch (err: any) {
    if (err?.status) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("GET /api/study-plans/[id]/edit-data error:", err);
    return NextResponse.json({ error: "Failed to load edit data" }, { status: 500 });
  }
}
