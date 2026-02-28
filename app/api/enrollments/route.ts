import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/jwt";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const courseId = Number(body.courseId || 0);
    if (!courseId) return NextResponse.json({ error: "courseId is required" }, { status: 400 });

    // Extract token from Authorization header or cookie
    const authHeader = request.headers.get("authorization") || "";
    let token: string | null = null;
    if (authHeader.startsWith("Bearer ")) token = authHeader.slice(7);
    else {
      const cookie = request.headers.get("cookie") || "";
      const m = /authToken=([^;]+)/.exec(cookie);
      if (m) token = decodeURIComponent(m[1]);
    }
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    if (payload.role !== "STUDENT") return NextResponse.json({ error: "Only students can enroll" }, { status: 403 });

    const studentId = payload.sub;

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course || !course.isPublished) return NextResponse.json({ error: "Course not found" }, { status: 404 });

    // Check for existing enrollment (unique composite studentId+courseId)
    const existing = await prisma.enrollment.findUnique({
      where: { studentId_courseId: { studentId, courseId } as any },
    });
    if (existing) {
      return NextResponse.json({ error: "Already enrolled", enrollment: existing }, { status: 200 });
    }

    // Check capacity
    if (course.capacity) {
      const activeCount = await prisma.enrollment.count({
        where: { courseId, status: "ACTIVE" },
      });
      if (activeCount >= course.capacity) {
        return NextResponse.json({ error: "Course is full" }, { status: 400 });
      }
    }

    const enrollment = await prisma.enrollment.create({
      data: {
        studentId,
        courseId,
        status: "ACTIVE",
      },
    });

    return NextResponse.json({ success: true, enrollment }, { status: 201 });
  } catch (err) {
    console.error("POST /api/enrollments error", err);
    return NextResponse.json({ error: "Failed to enroll" }, { status: 500 });
  }
}