import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/jwt";

function getToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization") || "";
  if (authHeader.startsWith("Bearer ")) return authHeader.slice(7);
  const cookie = request.headers.get("cookie") || "";
  const match = /authToken=([^;]+)/.exec(cookie);
  if (match) return decodeURIComponent(match[1]);
  return null;
}

// GET /api/submissions?assignmentId=1  or  ?courseId=1
// tutors see all submissions for their course, students only see their own
export async function GET(request: Request) {
  try {
    const token = getToken(request);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const assignmentId = Number(searchParams.get("assignmentId") || 0);
    const courseId = Number(searchParams.get("courseId") || 0);

    if (!assignmentId && !courseId) {
      return NextResponse.json({ error: "assignmentId or courseId is required" }, { status: 400 });
    }

    // build where clause
    const where: any = {};
    if (assignmentId) where.assignmentId = assignmentId;
    if (courseId) where.assignment = { courseId };

    // students only see their own submissions
    if (payload.role === "STUDENT") {
      where.studentId = payload.sub;
    }

    // tutors - verify they own the course before returning anything
    if (payload.role === "TUTOR") {
      // figure out which course this is for
      let targetCourseId = courseId;
      if (!targetCourseId && assignmentId) {
        const asgn = await prisma.assignment.findUnique({ where: { id: assignmentId } });
        if (asgn) targetCourseId = asgn.courseId;
      }
      if (targetCourseId) {
        const course = await prisma.course.findUnique({ where: { id: targetCourseId } });
        if (!course || course.tutorId !== payload.sub) {
          return NextResponse.json({ error: "You do not own this course" }, { status: 403 });
        }
      }
    }

    const submissions = await prisma.submission.findMany({
      where,
      orderBy: { submittedAt: "desc" },
      include: {
        student: { select: { id: true, fullName: true, email: true } },
        assignment: {
          select: {
            id: true, title: true, courseId: true,
            course: { select: { title: true } },
          },
        },
      },
    });

    return NextResponse.json(submissions);
  } catch (err) {
    console.error("GET /api/submissions error:", err);
    return NextResponse.json({ error: "Failed to fetch submissions" }, { status: 500 });
  }
}

// POST /api/submissions
// student submits their work for an assignment
// body: { assignmentId, content }
export async function POST(request: Request) {
  try {
    const token = getToken(request);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    if (payload.role !== "STUDENT") {
      return NextResponse.json({ error: "Only students can submit assignments" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const assignmentId = Number(body.assignmentId || 0);
    const content = (body.content || "").trim();

    if (!assignmentId) {
      return NextResponse.json({ error: "assignmentId is required" }, { status: 400 });
    }
    if (!content) {
      return NextResponse.json({ error: "Submission content cannot be empty" }, { status: 400 });
    }

    // check assignment exists
    const assignment = await prisma.assignment.findUnique({ where: { id: assignmentId } });
    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    // check student is enrolled in the course
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_courseId: { studentId: payload.sub, courseId: assignment.courseId } as any,
      },
    });
    if (!enrollment || enrollment.status !== "ACTIVE") {
      return NextResponse.json({ error: "You must be enrolled in the course to submit" }, { status: 403 });
    }

    // check if they already submitted - if so, update it (resubmit)
    const existing = await prisma.submission.findFirst({
      where: { assignmentId, studentId: payload.sub },
    });

    let submission;
    let resubmitted = false;

    if (existing) {
      // update existing submission and clear old review
      submission = await prisma.submission.update({
        where: { id: existing.id },
        data: {
          content,
          submittedAt: new Date(),
          grade: null,
          feedback: null,
          reviewedAt: null,
        },
      });
      resubmitted = true;
    } else {
      submission = await prisma.submission.create({
        data: { assignmentId, studentId: payload.sub, content },
      });
    }

    return NextResponse.json(
      { success: true, submission, resubmitted },
      { status: resubmitted ? 200 : 201 }
    );
  } catch (err) {
    console.error("POST /api/submissions error:", err);
    return NextResponse.json({ error: "Failed to submit" }, { status: 500 });
  }
}
