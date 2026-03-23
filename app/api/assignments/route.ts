import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/jwt";

// helper to grab the token from header or cookie (same pattern as enrollments route)
function getToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization") || "";
  if (authHeader.startsWith("Bearer ")) return authHeader.slice(7);
  const cookie = request.headers.get("cookie") || "";
  const match = /authToken=([^;]+)/.exec(cookie);
  if (match) return decodeURIComponent(match[1]);
  return null;
}

// GET /api/assignments?courseId=___
// fetches all assignments for a specific course
export async function GET(request: Request) {
  try {
    const token = getToken(request);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const courseId = Number(searchParams.get("courseId") || 0);
    if (!courseId) {
      return NextResponse.json({ error: "courseId is required" }, { status: 400 });
    }

    // if student, make sure theyre actually enrolled
    if (payload.role === "STUDENT") {
      const enrollment = await prisma.enrollment.findUnique({
        where: { studentId_courseId: { studentId: payload.sub, courseId } as any },
      });
      if (!enrollment || enrollment.status !== "ACTIVE") {
        return NextResponse.json({ error: "You are not enrolled in this course" }, { status: 403 });
      }
    }

    // if tutor, check they own the course
    if (payload.role === "TUTOR") {
      const course = await prisma.course.findUnique({ where: { id: courseId } });
      if (!course || course.tutorId !== payload.sub) {
        return NextResponse.json({ error: "You do not own this course" }, { status: 403 });
      }
    }

    const assignments = await prisma.assignment.findMany({
      where: { courseId },
      orderBy: { createdAt: "desc" },
      include: {
        course: { select: { id: true, title: true, subject: true } },
        _count: { select: { submissions: true } },
      },
    });

    return NextResponse.json(assignments);
  } catch (err) {
    console.error("GET /api/assignments error:", err);
    return NextResponse.json({ error: "Failed to fetch assignments" }, { status: 500 });
  }
}

// POST /api/assignments  - only tutors can create
// body: { courseId, title, description?, dueDate? }
export async function POST(request: Request) {
  try {
    const token = getToken(request);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    if (payload.role !== "TUTOR") {
      return NextResponse.json({ error: "Only tutors can create assignments" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const courseId = Number(body.courseId || 0);
    const title = (body.title || "").trim();
    const description = (body.description || "").trim() || null;
    const dueDate = body.dueDate ? new Date(body.dueDate) : null;

    if (!courseId || !title) {
      return NextResponse.json({ error: "courseId and title are required" }, { status: 400 });
    }

    // make sure the tutor actually owns this course
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course || course.tutorId !== payload.sub) {
      return NextResponse.json({ error: "You do not own this course" }, { status: 403 });
    }

    const assignment = await prisma.assignment.create({
      data: { courseId, title, description, dueDate },
    });

    return NextResponse.json(assignment, { status: 201 });
  } catch (err) {
    console.error("POST /api/assignments error:", err);
    return NextResponse.json({ error: "Failed to create assignment" }, { status: 500 });
  }
}
