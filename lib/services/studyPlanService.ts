// lib/services/studyPlanService.ts
// Business logic for study plans
// NFR15 - keeps route handlers thin

import * as planRepo from "@/lib/repositories/studyPlanRepository";
import * as courseRepo from "@/lib/repositories/courseRepository";
import { validateStudyPlanInput } from "@/lib/validators/planningValidator";

// FR13 - return all study plans that belong to the given student
export async function getStudentPlans(studentId: string) {
  return planRepo.findPlansByStudent(studentId);
}

// FR12 + NFR1 + NFR4 - create a study plan for the logged-in student
// studentId always comes from the JWT so it can't be forged by the client
export async function createPlan(studentId: string, body: any) {
  // NFR4 - validate task list before touching the database
  const error = validateStudyPlanInput(body);
  if (error) throw { status: 400, message: error };

  const tasks = (body.tasks as any[]).map((t) => ({
    title: t.title.trim(),
    dueDate: new Date(t.dueDate),
    courseId: Number(t.courseId),
  }));

  return planRepo.createStudyPlan(studentId, tasks);
}

// FR13 + NFR2 + NFR4 - update a plan
// Students can only edit their own plan.
// Tutors can only edit a plan if the student is enrolled in at least one of their courses —
// this prevents any tutor from editing any student's plan.
export async function updatePlan(
  planId: number,
  requesterId: string,
  requesterRole: string,
  body: any
) {
  const plan = await planRepo.findPlanById(planId);
  if (!plan) throw { status: 404, message: "Study plan not found" };

  if (requesterRole === "STUDENT") {
    // NFR2 - students can only edit their own plan
    if (plan.studentId !== requesterId) {
      throw { status: 403, message: "Forbidden: you do not own this study plan" };
    }
  } else if (requesterRole === "TUTOR") {
    // NFR2 - tutor may only edit if the student is enrolled in one of their courses
    const tutorCourseIds = await courseRepo.findCoursesByTutor(requesterId).then(
      (courses) => courses.map((c) => c.id)
    );
    const studentEnrollments = await courseRepo.findEnrolledCourses(plan.studentId);
    const enrolledCourseIds = studentEnrollments.map((e) => e.course.id);

    const hasSharedCourse = tutorCourseIds.some((id) => enrolledCourseIds.includes(id));
    if (!hasSharedCourse) {
      throw {
        status: 403,
        message: "Forbidden: this student is not enrolled in any of your courses",
      };
    }
  }

  // NFR4 - validate the incoming task data
  const error = validateStudyPlanInput(body);
  if (error) throw { status: 400, message: error };

  const tasks = (body.tasks as any[]).map((t) => ({
    title: t.title.trim(),
    dueDate: new Date(t.dueDate),
    courseId: Number(t.courseId),
  }));

  return planRepo.updateStudyPlan(planId, tasks);
}
