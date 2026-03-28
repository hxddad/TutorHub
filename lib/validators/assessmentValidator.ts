// lib/validators/assessmentValidator.ts
// NFR4 - validates assignment creation, submission, and review inputs

export interface AssignmentInput {
  courseId?: unknown;
  title?: unknown;
  description?: unknown;
  dueDate?: unknown;
}

export interface SubmissionInput {
  content?: unknown;
}

export interface ReviewInput {
  grade?: unknown;
  feedback?: unknown;
}

// NFR4 - courseId and title are required to create an assignment
export function validateAssignmentInput(body: AssignmentInput): string | null {
  const courseId = Number(body.courseId || 0);
  const title = (body.title ?? "").toString().trim();
  if (!courseId) return "courseId is required";
  if (!title) return "title is required";
  if (title.length > 300) return "title must be 300 characters or fewer";
  if (body.dueDate && isNaN(Date.parse(String(body.dueDate)))) {
    return "dueDate must be a valid date string";
  }
  return null;
}

// NFR4 - submission content cannot be empty
export function validateSubmissionInput(body: SubmissionInput): string | null {
  const content = (body.content ?? "").toString().trim();
  if (!content) return "content is required";
  return null;
}

// NFR4 - grade must be 0–100 if provided; feedback is optional
export function validateReviewInput(body: ReviewInput): string | null {
  if (body.grade !== undefined && body.grade !== null && body.grade !== "") {
    const grade = Number(body.grade);
    if (isNaN(grade) || grade < 0 || grade > 100) {
      return "grade must be a number between 0 and 100";
    }
  }
  return null;
}
