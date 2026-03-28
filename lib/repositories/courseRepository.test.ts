// lib/repositories/courseRepository.test.ts
// Unit tests for courseRepository — all Prisma calls are mocked
// NFR13 (testability), NFR15 (maintainability)

import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  course: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import {
  findPublishedCourses,
  findCourseById,
  findCoursesByTutor,
  createCourse,
  updateCourse,
  archiveCourse,
} from "./courseRepository";

describe("courseRepository", () => {
  beforeEach(() => vi.clearAllMocks());

  it("findPublishedCourses adds isPublished:true filter (FR4)", async () => {
    prismaMock.course.findMany.mockResolvedValue([]);
    await findPublishedCourses();
    expect(prismaMock.course.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ isPublished: true }) })
    );
  });

  it("findPublishedCourses adds subject filter when provided", async () => {
    prismaMock.course.findMany.mockResolvedValue([]);
    await findPublishedCourses("Maths");
    expect(prismaMock.course.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ subject: "Maths" }) })
    );
  });

  it("findCourseById queries by primary key (FR5)", async () => {
    prismaMock.course.findUnique.mockResolvedValue({ id: 1 });
    const result = await findCourseById(1);
    expect(prismaMock.course.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(result).toMatchObject({ id: 1 });
  });

  it("findCoursesByTutor filters by tutorId (FR5)", async () => {
    prismaMock.course.findMany.mockResolvedValue([]);
    await findCoursesByTutor("tutor-1");
    expect(prismaMock.course.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tutorId: "tutor-1" } })
    );
  });

  it("createCourse passes all fields to Prisma (FR5)", async () => {
    const data = { title: "T", subject: "S", tutorId: "tutor-1" };
    prismaMock.course.create.mockResolvedValue({ id: 1, ...data });
    const result = await createCourse(data);
    expect(prismaMock.course.create).toHaveBeenCalledWith({ data });
    expect(result).toMatchObject({ id: 1 });
  });

  it("updateCourse updates by id (FR5)", async () => {
    prismaMock.course.update.mockResolvedValue({ id: 1, title: "New" });
    await updateCourse(1, { title: "New" });
    expect(prismaMock.course.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 }, data: { title: "New" } })
    );
  });

  it("archiveCourse unpublishes by id instead of hard delete (FR5 + NFR2)", async () => {
    prismaMock.course.update.mockResolvedValue({ id: 1, isPublished: false });
    await archiveCourse(1);
    expect(prismaMock.course.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { isPublished: false } });
  });
});
