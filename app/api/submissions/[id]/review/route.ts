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

// PATCH /api/submissions/[id]/review
// tutor grades a submission and gives feedback
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const token = getToken(request);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    if (payload.role !== "TUTOR") {
      return NextResponse.json({ error: "Only tutors can review submissions" }, { status: 403 });
    }

    const submissionId = Number(params.id);
    if (Number.isNaN(submissionId)) {
      return NextResponse.json({ error: "Invalid submission id" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));

    // grade can be null if they just want to leave feedback
    let grade = null;
    if (body.grade !== undefined && body.grade !== null && body.grade !== "") {
      grade = Number(body.grade);
    }
    const feedback = (body.feedback || "").trim() || null;

    // get the submission and make sure the tutor owns the course
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        assignment: {
          include: { course: { select: { tutorId: true } } },
        },
      },
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    if (submission.assignment.course.tutorId !== payload.sub) {
      return NextResponse.json({ error: "You do not own this course" }, { status: 403 });
    }

    // update the submission with grade/feedback
    const updated = await prisma.submission.update({
      where: { id: submissionId },
      data: { grade, feedback, reviewedAt: new Date() },
    });

    return NextResponse.json({ success: true, submission: updated });
  } catch (err) {
    console.error("PATCH /api/submissions/[id]/review error:", err);
    return NextResponse.json({ error: "Failed to review submission" }, { status: 500 });
  }
}
