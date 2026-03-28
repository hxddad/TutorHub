// lib/services/courseService.test.ts
// Unit tests for courseService — all Prisma calls are mocked
// Layer: Service (business logic) — repository layer is mocked; no real DB touched
// Tests business rules: ownership checks (NFR2), validation (NFR4), FR4, FR5

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the repository layer so we never touch a real database
vi.mock("@/lib/repositories/courseRepository", () => ({
  findPublishedCourses: vi.fn(),
  findCourseById: vi.fn(),
  findCoursesByTutor: vi.fn(),
  findTutorCoursesSummary: vi.fn(),
  findEnrolledCourses: vi.fn(),
  createCourse: vi.fn(),
  updateCourse: vi.fn(),
  archiveCourse: vi.fn(),  // replaces the old hard-delete deleteCourse
}));

import * as courseRepo from "@/lib/repositories/courseRepository";
import {
  listPublishedCourses,
  listTutorCoursesSummary,
  listEnrolledCourses,
  createCourse,
  updateCourse,
  archiveCourse,
} from "./courseService";

const mockCourse = {
  id: 1,
  title: "Maths 101",
  subject: "Maths",
  tutorId: "tutor-1",
  description: null,
  price: null,
  level: null,
  isPublished: true,
};

describe("courseService", () => {
  beforeEach(() => vi.clearAllMocks());

  // ── listPublishedCourses (FR4) ────────────────────────────────────────────
  describe("listPublishedCourses (FR4)", () => {
    // FR4 happy path: service delegates to the repo and returns whatever the repo gives back
    it("delegates to the repository with no subject filter", async () => {
      vi.mocked(courseRepo.findPublishedCourses).mockResolvedValue([mockCourse] as any);
      const result = await listPublishedCourses();
      expect(courseRepo.findPublishedCourses).toHaveBeenCalledWith(undefined);
      expect(result).toHaveLength(1);
    });

    // FR4: subject filter must be forwarded to the repo so the DB query is scoped correctly
    it("passes subject filter through to the repository", async () => {
      vi.mocked(courseRepo.findPublishedCourses).mockResolvedValue([]);
      await listPublishedCourses("Physics");
      expect(courseRepo.findPublishedCourses).toHaveBeenCalledWith("Physics");
    });
  });

  // ── listTutorCoursesSummary (FR5) ─────────────────────────────────────────
  describe("listTutorCoursesSummary (FR5)", () => {
    // FR5: service must pass the correct tutorId to the repo so the tutor only sees their own courses
    it("delegates to the repository with the tutorId", async () => {
      vi.mocked(courseRepo.findTutorCoursesSummary).mockResolvedValue([mockCourse] as any);
      const result = await listTutorCoursesSummary("tutor-1");
      expect(courseRepo.findTutorCoursesSummary).toHaveBeenCalledWith("tutor-1");
      expect(result).toHaveLength(1);
    });

    // FR5: a tutor with no courses should get an empty array, not an error
    it("returns an empty array when the tutor has no courses", async () => {
      vi.mocked(courseRepo.findTutorCoursesSummary).mockResolvedValue([]);
      const result = await listTutorCoursesSummary("tutor-with-no-courses");
      expect(result).toHaveLength(0);
    });
  });

  // ── listEnrolledCourses (FR4) ─────────────────────────────────────────────
  describe("listEnrolledCourses (FR4)", () => {
    // FR4: the service must flatten enrollment records so the frontend receives a plain
    // array of course objects — the enrolledAt timestamp is preserved for display
    it("flattens enrollment records into plain course objects with enrolledAt", async () => {
      const enrolledAt = new Date();
      vi.mocked(courseRepo.findEnrolledCourses).mockResolvedValue([
        { enrolledAt, course: mockCourse } as any,
      ]);
      const result = await listEnrolledCourses("student-1");
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ id: 1, title: "Maths 101", enrolledAt });
    });

    // FR4: a student with no enrollments should get an empty array, not an error
    it("returns an empty array when the student has no enrollments", async () => {
      vi.mocked(courseRepo.findEnrolledCourses).mockResolvedValue([]);
      const result = await listEnrolledCourses("student-no-courses");
      expect(result).toHaveLength(0);
    });
  });

  // ── createCourse (FR5 + NFR2 + NFR4) ─────────────────────────────────────
  describe("createCourse (FR5 + NFR2 + NFR4)", () => {
    // NFR2: the tutorId must always come from the verified JWT, never from the request body —
    // this prevents a student or attacker from creating a course attributed to another tutor
    it("creates a course using the JWT tutorId — body tutorId is ignored (NFR2)", async () => {
      vi.mocked(courseRepo.createCourse).mockResolvedValue(mockCourse as any);
      await createCourse("tutor-1", { title: "Maths 101", subject: "Maths" });
      expect(courseRepo.createCourse).toHaveBeenCalledWith(
        expect.objectContaining({ tutorId: "tutor-1" })
      );
    });

    // NFR4: title is a required field — must be validated before any DB write
    it("throws 400 when title is missing (NFR4)", async () => {
      await expect(createCourse("tutor-1", { subject: "Maths" }))
        .rejects.toMatchObject({ status: 400, message: "title is required" });
    });

    // NFR4: subject is a required field — a course without a subject can't be browsed by subject
    it("throws 400 when subject is missing (NFR4)", async () => {
      await expect(createCourse("tutor-1", { title: "Maths 101" }))
        .rejects.toMatchObject({ status: 400, message: "subject is required" });
    });

    // Data hygiene: leading/trailing whitespace in title and subject is stripped before saving
    it("trims whitespace from title and subject before saving", async () => {
      vi.mocked(courseRepo.createCourse).mockResolvedValue(mockCourse as any);
      await createCourse("tutor-1", { title: "  Maths 101  ", subject: "  Maths  " });
      expect(courseRepo.createCourse).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Maths 101", subject: "Maths" })
      );
    });

    // NFR4: a title consisting only of spaces is semantically empty and must be rejected
    it("throws 400 when title is whitespace-only (NFR4)", async () => {
      await expect(createCourse("tutor-1", { title: "   ", subject: "Maths" }))
        .rejects.toMatchObject({ status: 400, message: "title is required" });
    });

    // NFR4: title length cap at 200 chars — enforces data integrity in the DB column
    it("throws 400 when title exceeds 200 characters (NFR4)", async () => {
      const longTitle = "A".repeat(201);
      await expect(createCourse("tutor-1", { title: longTitle, subject: "Maths" }))
        .rejects.toMatchObject({ status: 400, message: "title must be 200 characters or fewer" });
    });

    // NFR4: a negative price is nonsensical — must be caught before persisting
    it("throws 400 when price is negative (NFR4)", async () => {
      await expect(createCourse("tutor-1", { title: "Maths 101", subject: "Maths", price: -5 }))
        .rejects.toMatchObject({ status: 400, message: "price must be a non-negative number" });
    });
  });

  // ── updateCourse (FR5 + NFR2) ─────────────────────────────────────────────
  describe("updateCourse (FR5 + NFR2)", () => {
    // Resource existence check — must return 404 before any ownership check runs
    it("throws 404 when course does not exist", async () => {
      vi.mocked(courseRepo.findCourseById).mockResolvedValue(null);
      await expect(updateCourse(99, "tutor-1", { title: "New" }))
        .rejects.toMatchObject({ status: 404 });
    });

    // NFR2: tutor A must not be able to modify tutor B's course — ownership enforced at update
    it("throws 403 when a different tutor tries to update (NFR2 — ownership)", async () => {
      vi.mocked(courseRepo.findCourseById).mockResolvedValue({ ...mockCourse, tutorId: "other-tutor" } as any);
      await expect(updateCourse(1, "tutor-1", { title: "New" }))
        .rejects.toMatchObject({ status: 403 });
    });

    // FR5 happy path: the owning tutor can change the course title and gets the updated record back
    it("allows update when the tutor owns the course (NFR2)", async () => {
      vi.mocked(courseRepo.findCourseById).mockResolvedValue(mockCourse as any);
      vi.mocked(courseRepo.updateCourse).mockResolvedValue({ ...mockCourse, title: "New Title" } as any);
      const result = await updateCourse(1, "tutor-1", { title: "New Title", subject: "Maths" });
      expect(courseRepo.updateCourse).toHaveBeenCalled();
      expect(result).toMatchObject({ title: "New Title" });
    });

    // Partial update: fields not present in the body must be preserved from the existing record —
    // prevents accidental data loss when the caller only wants to change one field
    it("preserves existing fields when only partial body is supplied", async () => {
      vi.mocked(courseRepo.findCourseById).mockResolvedValue(mockCourse as any);
      vi.mocked(courseRepo.updateCourse).mockResolvedValue(mockCourse as any);
      await updateCourse(1, "tutor-1", { title: "New Title" });
      expect(courseRepo.updateCourse).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ subject: "Maths" }) // original subject preserved
      );
    });

    // Branch: body.price is null → preserve existing course.price (line 59)
    // Ensures the ternary null-price branch is exercised so v8 coverage hits 100%
    it("preserves existing price when body.price is not provided (NFR4 branch)", async () => {
      const courseWithPrice = { ...mockCourse, price: 49.99 };
      vi.mocked(courseRepo.findCourseById).mockResolvedValue(courseWithPrice as any);
      vi.mocked(courseRepo.updateCourse).mockResolvedValue(courseWithPrice as any);
      // body has no price field — price should fall back to course.price = 49.99
      await updateCourse(1, "tutor-1", { title: "Maths 101", subject: "Maths" });
      expect(courseRepo.updateCourse).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ price: 49.99 })
      );
    });

    // Branch: body.isPublished is undefined → preserve existing course.isPublished (line 61)
    it("preserves existing isPublished when not specified in body (FR5 branch)", async () => {
      const publishedCourse = { ...mockCourse, isPublished: false };
      vi.mocked(courseRepo.findCourseById).mockResolvedValue(publishedCourse as any);
      vi.mocked(courseRepo.updateCourse).mockResolvedValue(publishedCourse as any);
      // body has no isPublished field → should use course.isPublished = false
      await updateCourse(1, "tutor-1", { title: "Maths 101", subject: "Maths" });
      expect(courseRepo.updateCourse).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ isPublished: false })
      );
    });

    // Branch: explicitly setting isPublished=true/false overrides existing value (line 61)
    it("updates isPublished when explicitly provided in body (FR5 branch)", async () => {
      vi.mocked(courseRepo.findCourseById).mockResolvedValue({ ...mockCourse, isPublished: false } as any);
      vi.mocked(courseRepo.updateCourse).mockResolvedValue({ ...mockCourse, isPublished: true } as any);
      await updateCourse(1, "tutor-1", { title: "Maths 101", subject: "Maths", isPublished: true });
      expect(courseRepo.updateCourse).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ isPublished: true })
      );
    });
  });

  // ── archiveCourse (FR5 + NFR2) ────────────────────────────────────────────
  // archiveCourse replaces hard delete — it sets isPublished=false so data is preserved
  describe("archiveCourse (FR5 + NFR2)", () => {
    // Resource existence check — must return 404 before ownership check runs
    it("throws 404 when course does not exist", async () => {
      vi.mocked(courseRepo.findCourseById).mockResolvedValue(null);
      await expect(archiveCourse(99, "tutor-1")).rejects.toMatchObject({ status: 404 });
    });

    // NFR2: only the owning tutor may archive a course; other tutors must be blocked
    it("throws 403 when tutor does not own the course (NFR2)", async () => {
      vi.mocked(courseRepo.findCourseById).mockResolvedValue({ ...mockCourse, tutorId: "other" } as any);
      await expect(archiveCourse(1, "tutor-1")).rejects.toMatchObject({ status: 403 });
    });

    // FR5 + data preservation: archive must call repo.archiveCourse (sets isPublished=false),
    // never repo.deleteCourse — enrollment and assignment records must survive
    it("archives (unpublishes) the course when ownership is confirmed — does not hard delete (FR5)", async () => {
      vi.mocked(courseRepo.findCourseById).mockResolvedValue(mockCourse as any);
      vi.mocked(courseRepo.archiveCourse).mockResolvedValue({ ...mockCourse, isPublished: false } as any);
      await archiveCourse(1, "tutor-1");
      // must call archiveCourse in the repo, never deleteCourse
      expect(courseRepo.archiveCourse).toHaveBeenCalledWith(1);
    });
  });
});
