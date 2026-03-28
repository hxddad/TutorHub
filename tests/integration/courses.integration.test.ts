// tests/integration/courses.integration.test.ts
// Integration tests for course browsing, creation, updating, archiving, and enrollment
// Layer: Route → Service → Repository → mocked Prisma (no real DB)
// Covers FR4 (browse), FR6 (enrol), FR5 (manage courses), NFR1, NFR2, NFR4

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/jwt", () => ({ verifyToken: vi.fn() }));

const prismaMock = vi.hoisted(() => ({
  course: {
    findMany:  vi.fn(),
    findUnique: vi.fn(),
    create:    vi.fn(),
    update:    vi.fn(),
    delete:    vi.fn(),
  },
  enrollment: {
    findUnique: vi.fn(),
    create:     vi.fn(),
    count:      vi.fn(),
    findMany:   vi.fn(),
  },
}));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { verifyToken } from "@/lib/jwt";
import { GET, POST, PATCH, DELETE } from "@/app/api/courses/route";
import { POST as enroll }              from "@/app/api/enrollments/route";
import { GET as getEnrolled }          from "@/app/api/courses/enrolled/route";
import { GET as getMine }              from "@/app/api/courses/mine/route";

const tutorA   = { sub: "tutor-a",   role: "TUTOR"   };
const tutorB   = { sub: "tutor-b",   role: "TUTOR"   };
const student  = { sub: "student-1", role: "STUDENT" };

// helper to build a request — GET/HEAD never have a body
function req(method: string, url: string, body?: object, auth?: typeof tutorA): Request {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) headers["Authorization"] = "Bearer token";
  const isBodyless = method === "GET" || method === "HEAD";
  return new Request(url, {
    method,
    headers,
    ...(isBodyless ? {} : { body: body ? JSON.stringify(body) : undefined }),
  });
}

const mockCourse = { id: 1, title: "Maths 101", subject: "Maths", tutorId: "tutor-a", isPublished: true };

describe("Courses integration", () => {
  beforeEach(() => vi.clearAllMocks());

  // ── Public course browsing (FR4) ──────────────────────────────────────────
  describe("GET /api/courses — browse published courses (FR4)", () => {
    // FR4: course browsing is a public feature — no authentication should be required
    it("works without any login because browsing is public", async () => {
      prismaMock.course.findMany.mockResolvedValue([mockCourse]);

      // no auth token in this request
      const res = await GET(req("GET", "http://localhost/api/courses"));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveLength(1);
    });

    // FR4 + soft-delete: the DB query must always include isPublished=true —
    // archived courses must never appear in the public listing
    it("only returns courses with isPublished=true", async () => {
      prismaMock.course.findMany.mockResolvedValue([]);

      await GET(req("GET", "http://localhost/api/courses"));

      expect(prismaMock.course.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ isPublished: true }) })
      );
    });

    // FR4: the subject query parameter must be forwarded to the DB WHERE clause
    // so the listing is scoped to the requested subject
    it("filters by subject when the query param is set", async () => {
      prismaMock.course.findMany.mockResolvedValue([]);

      await GET(req("GET", "http://localhost/api/courses?subject=Physics"));

      expect(prismaMock.course.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ subject: "Physics" }) })
      );
    });

    // FR5 + soft-delete round-trip: after a course is archived (isPublished=false) it must
    // not appear in the public browse — verified by confirming the WHERE clause filters to
    // isPublished=true (so the DB never returns the archived record)
    it("archived course (isPublished=false) does not appear in public browse (FR5 + soft delete)", async () => {
      // Simulate the state after archiving: the DB only returns published courses
      prismaMock.course.findMany.mockResolvedValue([]);

      const res = await GET(req("GET", "http://localhost/api/courses"));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveLength(0);

      // The WHERE clause must filter to isPublished=true so archived courses are excluded
      expect(prismaMock.course.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ isPublished: true }) })
      );
    });
  });

  // ── Creating a course (FR5) ───────────────────────────────────────────────
  describe("POST /api/courses — tutor creates a course (FR5)", () => {
    // NFR1: an unauthenticated request must be refused — creating a course requires a verified identity
    it("returns 401 when not logged in (NFR1)", async () => {
      vi.mocked(verifyToken).mockReturnValue(null);
      const res = await POST(req("POST", "http://localhost/api/courses", { title: "T", subject: "S" }));
      expect(res.status).toBe(401);
    });

    // NFR2: only tutors may create courses — a student who sends a valid JWT is still blocked
    it("returns 403 when a student tries to create a course (NFR2)", async () => {
      vi.mocked(verifyToken).mockReturnValue(student as any);
      const res = await POST(req("POST", "http://localhost/api/courses", { title: "T", subject: "S" }, student));
      expect(res.status).toBe(403);
    });

    // NFR2 identity injection: tutorId must come from the JWT, not the request body —
    // an attacker submitting a different tutorId in the body must be ignored
    it("uses the JWT tutorId — ignores any tutorId in the request body (NFR2)", async () => {
      vi.mocked(verifyToken).mockReturnValue(tutorA as any);
      prismaMock.course.create.mockResolvedValue({ ...mockCourse, tutorId: "tutor-a" });

      await POST(req("POST", "http://localhost/api/courses", {
        title: "Maths", subject: "Maths", tutorId: "hacker-id",
      }, tutorA));

      expect(prismaMock.course.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ tutorId: "tutor-a" }) })
      );
    });

    // NFR4: title is required — missing it must produce a 400 before touching the DB
    it("returns 400 when title is missing (NFR4)", async () => {
      vi.mocked(verifyToken).mockReturnValue(tutorA as any);
      const res = await POST(req("POST", "http://localhost/api/courses", { subject: "S" }, tutorA));
      expect(res.status).toBe(400);
    });

    // NFR4: subject is required — a course without a subject cannot be browsed by subject
    it("returns 400 when subject is missing (NFR4)", async () => {
      vi.mocked(verifyToken).mockReturnValue(tutorA as any);
      const res = await POST(req("POST", "http://localhost/api/courses", { title: "T" }, tutorA));
      expect(res.status).toBe(400);
    });

    // FR5 happy path: authenticated tutor provides all required fields — course is created (201)
    it("creates the course and returns 201 for a valid request (FR5)", async () => {
      vi.mocked(verifyToken).mockReturnValue(tutorA as any);
      prismaMock.course.create.mockResolvedValue(mockCourse);

      const res = await POST(req("POST", "http://localhost/api/courses", {
        title: "Maths 101", subject: "Maths",
      }, tutorA));

      expect(res.status).toBe(201);
    });
  });

  // ── Updating a course (FR5 + NFR2) ────────────────────────────────────────
  describe("PATCH /api/courses — tutor updates their own course (FR5 + NFR2)", () => {
    // NFR2 cross-tutor: tutor B must not be able to modify a course that belongs to tutor A
    it("returns 403 when Tutor B tries to update Tutor A's course", async () => {
      vi.mocked(verifyToken).mockReturnValue(tutorB as any);
      prismaMock.course.findUnique.mockResolvedValue({ ...mockCourse, tutorId: "tutor-a" });

      const res = await PATCH(req("PATCH", "http://localhost/api/courses?id=1", { title: "Stolen" }, tutorB));
      expect(res.status).toBe(403);
    });

    // Resource existence: patching a non-existent course ID must return 404
    it("returns 404 when the course does not exist", async () => {
      vi.mocked(verifyToken).mockReturnValue(tutorA as any);
      prismaMock.course.findUnique.mockResolvedValue(null);

      const res = await PATCH(req("PATCH", "http://localhost/api/courses?id=999", { title: "T", subject: "S" }, tutorA));
      expect(res.status).toBe(404);
    });

    // FR5 happy path: the owning tutor successfully updates their course title
    it("succeeds when the tutor owns the course (FR5)", async () => {
      vi.mocked(verifyToken).mockReturnValue(tutorA as any);
      prismaMock.course.findUnique.mockResolvedValue(mockCourse);
      prismaMock.course.update.mockResolvedValue({ ...mockCourse, title: "Updated" });

      const res = await PATCH(req("PATCH", "http://localhost/api/courses?id=1", {
        title: "Updated", subject: "Maths",
      }, tutorA));
      expect(res.status).toBe(200);
    });
  });

  // ── Archiving a course (FR5 + NFR2) ──────────────────────────────────────
  describe("DELETE /api/courses — archive instead of hard delete (FR5 + NFR2)", () => {
    // NFR2 cross-tutor: tutor B must not be able to archive tutor A's course
    it("returns 403 when Tutor B tries to archive Tutor A's course", async () => {
      vi.mocked(verifyToken).mockReturnValue(tutorB as any);
      prismaMock.course.findUnique.mockResolvedValue({ ...mockCourse, tutorId: "tutor-a" });

      const res = await DELETE(req("DELETE", "http://localhost/api/courses?id=1", undefined, tutorB));
      expect(res.status).toBe(403);
    });

    // FR5 data preservation: the DELETE endpoint must call course.update (sets isPublished=false),
    // never course.delete — enrollment and assignment records must survive so tutors
    // can still access historical data
    it("sets isPublished=false instead of deleting the record (FR5 — data preservation)", async () => {
      vi.mocked(verifyToken).mockReturnValue(tutorA as any);
      prismaMock.course.findUnique.mockResolvedValue(mockCourse);
      prismaMock.course.update.mockResolvedValue({ ...mockCourse, isPublished: false });

      const res = await DELETE(req("DELETE", "http://localhost/api/courses?id=1", undefined, tutorA));
      expect(res.status).toBe(200);
      // archive uses course.update, never course.delete
      expect(prismaMock.course.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isPublished: false } })
      );
      expect(prismaMock.course.delete).not.toHaveBeenCalled();
    });
  });

  // ── Student enrollment (FR6) ──────────────────────────────────────────────
  describe("POST /api/enrollments — student enrols (FR6)", () => {
    // NFR2: enrollment is a student-only action — a tutor sending a valid JWT must be blocked
    it("returns 403 when a tutor tries to enrol (NFR2 — enrollment is student-only)", async () => {
      vi.mocked(verifyToken).mockReturnValue(tutorA as any);
      const res = await enroll(req("POST", "http://localhost/api/enrollments", { courseId: 1 }, tutorA));
      expect(res.status).toBe(403);
    });

    // NFR2 identity injection: studentId must come from the JWT — any studentId in the body
    // must be silently ignored to prevent one student enrolling on behalf of another
    it("uses JWT studentId — ignores any studentId in the body (NFR2)", async () => {
      vi.mocked(verifyToken).mockReturnValue(student as any);
      prismaMock.course.findUnique.mockResolvedValue({ ...mockCourse, capacity: null });
      prismaMock.enrollment.findUnique.mockResolvedValue(null);
      prismaMock.enrollment.create.mockResolvedValue({ id: 1, studentId: "student-1", courseId: 1 });

      await enroll(req("POST", "http://localhost/api/enrollments", {
        courseId: 1, studentId: "hacker-id",
      }, student));

      expect(prismaMock.enrollment.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ studentId: "student-1" }) })
      );
    });

    // FR6 capacity: a course that is full must reject new enrollments —
    // current count equals capacity
    it("returns 400 when the course is at capacity (FR6)", async () => {
      vi.mocked(verifyToken).mockReturnValue(student as any);
      prismaMock.course.findUnique.mockResolvedValue({ ...mockCourse, capacity: 2 });
      prismaMock.enrollment.findUnique.mockResolvedValue(null);
      prismaMock.enrollment.count.mockResolvedValue(2); // already full

      const res = await enroll(req("POST", "http://localhost/api/enrollments", { courseId: 1 }, student));
      expect(res.status).toBe(400);
    });

    // FR6 + soft-delete: an archived (unpublished) course must not accept new enrollments —
    // returns 404 so the existence of the draft is not leaked to students
    it("returns 404 when the course is unpublished (FR6)", async () => {
      vi.mocked(verifyToken).mockReturnValue(student as any);
      prismaMock.course.findUnique.mockResolvedValue({ ...mockCourse, isPublished: false });

      const res = await enroll(req("POST", "http://localhost/api/enrollments", { courseId: 1 }, student));
      expect(res.status).toBe(404);
    });
  });

  // ── Enrolled courses list (FR6) ───────────────────────────────────────────
  describe("GET /api/courses/enrolled — student's enrolled courses (FR6)", () => {
    // NFR2 data isolation: the query must be scoped to the authenticated student's ID —
    // a student must not be able to see another student's enrollment list
    it("only returns the authenticated student's own courses (NFR2)", async () => {
      vi.mocked(verifyToken).mockReturnValue(student as any);
      prismaMock.enrollment.findMany.mockResolvedValue([{
        enrolledAt: new Date(),
        course: { id: 1, title: "Maths", subject: "M", level: "Beginner", tutor: { fullName: "T" }, _count: { assignments: 0 } },
      }]);

      const res = await getEnrolled(req("GET", "http://localhost/api/courses/enrolled", undefined, student));
      expect(res.status).toBe(200);
      expect(prismaMock.enrollment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ studentId: "student-1" }) })
      );
    });

    // NFR2: tutors must not access the enrolled-courses endpoint — they use /courses/mine instead
    it("returns 403 for tutors (NFR2 — tutors use /courses/mine instead)", async () => {
      vi.mocked(verifyToken).mockReturnValue(tutorA as any);
      const res = await getEnrolled(req("GET", "http://localhost/api/courses/enrolled", undefined, tutorA));
      expect(res.status).toBe(403);
    });
  });

  // ── Tutor course list (FR5) ───────────────────────────────────────────────
  describe("GET /api/courses/mine — tutor's own courses (FR5)", () => {
    // NFR2 data isolation: the query must be scoped to the authenticated tutor's ID —
    // a tutor must not be able to see another tutor's course list
    it("returns only the logged-in tutor's courses (NFR2)", async () => {
      vi.mocked(verifyToken).mockReturnValue(tutorA as any);
      prismaMock.course.findMany.mockResolvedValue([mockCourse]);

      const res = await getMine(req("GET", "http://localhost/api/courses/mine", undefined, tutorA));
      expect(res.status).toBe(200);
      expect(prismaMock.course.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tutorId: "tutor-a" } })
      );
    });

    // NFR2: students must not access the tutor course list — they use /courses/enrolled instead
    it("returns 403 for students (NFR2 — students use /courses/enrolled instead)", async () => {
      vi.mocked(verifyToken).mockReturnValue(student as any);
      const res = await getMine(req("GET", "http://localhost/api/courses/mine", undefined, student));
      expect(res.status).toBe(403);
    });
  });
});
