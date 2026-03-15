import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/jwt";

// get token from cookie or authorization header
function getToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization") || "";
  if (authHeader.startsWith("Bearer ")) return authHeader.slice(7);
  const cookie = request.headers.get("cookie") || "";
  const match = /authToken=([^;]+)/.exec(cookie);
  if (match) return decodeURIComponent(match[1]);
  return null;
}

// GET /api/assignments/[id]
// returns assignment details + submissions (students see only theirs, tutors see all)
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const token = getToken(request);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const id = Number(params.id);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: "Invalid assignment id" }, { status: 400 });
    }

    // fetch the assignment - include different stuff depending on role
    let assignment;
    if (payload.role === "TUTOR") {
      assignment = await prisma.assignment.findUnique({
        where: { id },
        include: {
          course: { select: { id: true, title: true, subject: true, tutorId: true } },
          submissions: {
            include: {
              student: { select: { id: true, fullName: true, email: true } },
            },
            orderBy: { submittedAt: "desc" },
          },
        },
      });
    } else {
      // student - only get their own submissions
      assignment = await prisma.assignment.findUnique({
        where: { id },
        include: {
          course: { select: { id: true, title: true, subject: true, tutorId: true } },
          submissions: {
            where: { studentId: payload.sub },
          },
        },
      });
    }

    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    // check access - student must be enrolled
    if (payload.role === "STUDENT") {
      const enrollment = await prisma.enrollment.findUnique({
        where: {
          studentId_courseId: { studentId: payload.sub, courseId: assignment.courseId } as any,
        },
      });
      if (!enrollment || enrollment.status !== "ACTIVE") {
        return NextResponse.json({ error: "You are not enrolled in this course" }, { status: 403 });
      }
    }

    // tutor must own the course
    if (payload.role === "TUTOR" && assignment.course.tutorId !== payload.sub) {
      return NextResponse.json({ error: "You do not own this course" }, { status: 403 });
    }

    return NextResponse.json(assignment);
  } catch (err) {
    console.error("GET /api/assignments/[id] error:", err);
    return NextResponse.json({ error: "Failed to fetch assignment" }, { status: 500 });
  }
}
