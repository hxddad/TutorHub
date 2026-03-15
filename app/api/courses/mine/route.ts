import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/jwt";

// GET /api/courses/mine
// returns the courses that belong to the logged-in tutor
export async function GET(request: Request) {
  try {
    // grab token
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
    if (payload.role !== "TUTOR") {
      return NextResponse.json({ error: "Only tutors can access this" }, { status: 403 });
    }

    const courses = await prisma.course.findMany({
      where: { tutorId: payload.sub },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        subject: true,
        isPublished: true,
        _count: { select: { enrollments: true, assignments: true } },
      },
    });

    return NextResponse.json(courses);
  } catch (err) {
    console.error("GET /api/courses/mine error:", err);
    return NextResponse.json({ error: "Failed to fetch courses" }, { status: 500 });
  }
}
