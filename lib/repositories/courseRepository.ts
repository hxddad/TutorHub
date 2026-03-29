// courseRepository.ts
// Keeps all the direct Prisma calls for courses in one place
// This is part of the repository pattern - NFR15 (maintainability) and NFR13 (testability)
// Routes and services never call prisma.course directly, they go through here

import { prisma } from "@/lib/prisma";

export interface CourseCreateData {
  title: string;
  subject: string;
  description?: string | null;
  tutorId: string;
  price?: number | null;
  level?: string | null;
  isPublished?: boolean;
}

export interface CourseUpdateData {
  title?: string;
  subject?: string;
  description?: string | null;
  price?: number | null;
  level?: string | null;
  isPublished?: boolean;
}

// FR4 - fetch all published courses for the browse page
export async function findPublishedCourses(subject?: string) {
  const where: any = { isPublished: true };
  if (subject) where.subject = subject;
  return prisma.course.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { tutor: { select: { id: true, fullName: true, avatar: true } } },
  });
}

// FR5 - look up a single course (used before update/archive to check ownership)
export async function findCourseById(id: number) {
  return prisma.course.findUnique({ where: { id } });
}

// FR5 - get all courses belonging to a specific tutor
export async function findCoursesByTutor(tutorId: string) {
  return prisma.course.findMany({
    where: { tutorId },
    orderBy: { createdAt: "desc" },
    include: { tutor: { select: { id: true, fullName: true, avatar: true } } },
  });
}

// FR5 - create a new course
export async function createCourse(data: CourseCreateData) {
  return prisma.course.create({ data });
}

// FR5 - update an existing course (ownership is checked in the service layer before this runs)
export async function updateCourse(id: number, data: CourseUpdateData) {
  return prisma.course.update({ where: { id }, data });
}


// FR4/FR5 - get courses a student is actively enrolled in (for courses/enrolled route)
export async function findEnrolledCourses(studentId: string) {
  return prisma.enrollment.findMany({
    where: { studentId, status: "ACTIVE" },
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
}

// FR5 - get the compact summary list for the tutor's "My Courses" dashboard page
export async function findTutorCoursesSummary(tutorId: string) {
  return prisma.course.findMany({
    where: { tutorId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      subject: true,
      isPublished: true,
      _count: { select: { enrollments: true, assignments: true } },
    },
  });
}

// NFR2 - check whether a student has an active enrollment in a specific course
export async function findActiveEnrollment(studentId: string, courseId: number) {
  return prisma.enrollment.findUnique({
    where: { studentId_courseId: { studentId, courseId } as any },
  });
}

// FR5 - archive a course (safe alternative to hard delete)
// sets isPublished=false so students can no longer see or enrol; data is preserved
export async function archiveCourse(id: number) {
  return prisma.course.update({
    where: { id },
    data: { isPublished: false },
  });
}
