import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const subject = searchParams.get("subject");
    const where: any = { isPublished: true };

    if (subject) {
      where.subject = subject;
    }

    const courses = await prisma.course.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        tutor: {
          select: { id: true, fullName: true, avatar: true },
        },
      },
    });

    return NextResponse.json(courses);
  } catch (err) {
    console.error("GET /api/courses error", err);
    return NextResponse.json({ error: "Failed to fetch courses" }, { status: 500 });
  }
}