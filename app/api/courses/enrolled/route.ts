import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/jwt";

// GET /api/courses/enrolled
// returns the courses the logged in student is enrolled in
export async function GET(request: Request) {
  try {
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

    if (payload.role !== "STUDENT") {
      return NextResponse.json({ error: "Only students can access this" }, { status: 403 });
    }

    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: payload.sub, status: "ACTIVE" },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            subject: true,
            level: true,
            tutor: { select: { fullName: true } },
            _count: { select: { assignments: true } },
          },
        },
      },
      orderBy: { enrolledAt: "desc" },
    });

    // flatten it so the frontend just gets course objects
    const courses = enrollments.map((e) => ({
      ...e.course,
      enrolledAt: e.enrolledAt,
    }));

    return NextResponse.json(courses);
  } catch (err) {
    console.error("GET /api/courses/enrolled error:", err);
    return NextResponse.json({ error: "Failed to fetch enrolled courses" }, { status: 500 });
  }
}
