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

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    // Prefer header (set by dashboard middleware) fallback to body.tutorId
    const hdrs = (request as any).headers || new Headers();
    const tutorIdHeader = hdrs.get ? hdrs.get("x-user-id") : null;
    const tutorId = tutorIdHeader || body.tutorId;

    if (!tutorId) {
      return NextResponse.json({ error: "tutorId is required" }, { status: 400 });
    }
    const title = (body.title || "").toString().trim();
    const subject = (body.subject || "").toString().trim();
    if (!title || !subject) {
      return NextResponse.json({ error: "title and subject are required" }, { status: 400 });
    }

    const course = await prisma.course.create({
      data: {
        title,
        subject,
        description: body.description || null,
        tutorId,
        price: typeof body.price === "number" ? body.price : body.price ? parseFloat(body.price) : null,
        level: body.level || null,
        isPublished: !!body.isPublished,
      },
    });

    return NextResponse.json(course, { status: 201 });
  } catch (err) {
    console.error("POST /api/courses error", err);
    return NextResponse.json({ error: "Failed to create course" }, { status: 500 });
  }
}