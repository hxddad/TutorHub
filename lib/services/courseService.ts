// lib/services/courseService.ts
// Business logic for courses — routes stay thin; all rules live here
// NFR15 (separation of concerns)

import * as courseRepo from "@/lib/repositories/courseRepository";
import { validateCourseInput } from "@/lib/validators/courseValidator";

// FR4 - return published courses, optionally filtered by subject
export async function listPublishedCourses(subject?: string) {
  return courseRepo.findPublishedCourses(subject);
}

// FR5 - return the compact dashboard list for the logged-in tutor
export async function listTutorCoursesSummary(tutorId: string) {
  return courseRepo.findTutorCoursesSummary(tutorId);
}

// FR4 - return courses the logged-in student is actively enrolled in
export async function listEnrolledCourses(studentId: string) {
  const enrollments = await courseRepo.findEnrolledCourses(studentId);
  // flatten so the frontend gets a plain array of course objects
  return enrollments.map((e) => ({ ...e.course, enrolledAt: e.enrolledAt }));
}

// FR5 + NFR2 + NFR4 - create a course for the authenticated tutor
// tutorId always comes from the JWT, never from the request body
export async function createCourse(tutorId: string, body: any) {
  // NFR4 - validate before touching the database
  const error = validateCourseInput(body);
  if (error) throw { status: 400, message: error };

  return courseRepo.createCourse({
    title: body.title.toString().trim(),
    subject: body.subject.toString().trim(),
    description: body.description || null,
    tutorId,
    price: body.price != null ? parseFloat(body.price) : null,
    level: body.level || null,
    isPublished: !!body.isPublished,
  });
}

// FR5 + NFR2 + NFR4 - update a course only if the tutor owns it
export async function updateCourse(courseId: number, tutorId: string, body: any) {
  const course = await courseRepo.findCourseById(courseId);
  if (!course) throw { status: 404, message: "Course not found" };

  // NFR2 - ownership check
  if (course.tutorId !== tutorId) throw { status: 403, message: "Forbidden" };

  // NFR4 - merge existing values so partial updates still pass validation
  const error = validateCourseInput({ ...course, ...body });
  if (error) throw { status: 400, message: error };

  return courseRepo.updateCourse(courseId, {
    title: body.title?.toString().trim() ?? course.title,
    subject: body.subject?.toString().trim() ?? course.subject,
    description: body.description ?? course.description,
    price: body.price != null ? parseFloat(body.price) : course.price,
    level: body.level ?? course.level,
    isPublished: body.isPublished !== undefined ? !!body.isPublished : course.isPublished,
  });
}

// FR5 + NFR2 - archive a course (safe alternative to hard delete)
// sets isPublished=false so students can no longer see or enroll
// preserves all enrollment, assignment and submission data
export async function archiveCourse(courseId: number, tutorId: string) {
  const course = await courseRepo.findCourseById(courseId);
  if (!course) throw { status: 404, message: "Course not found" };

  // NFR2 - ownership check
  if (course.tutorId !== tutorId) throw { status: 403, message: "Forbidden" };

  return courseRepo.archiveCourse(courseId);
}
