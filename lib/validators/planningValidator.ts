// lib/validators/planningValidator.ts
// NFR4 - validates study plan and task inputs

export interface StudyPlanInput {
  tasks?: unknown;
}

export interface TaskToggleInput {
  completed?: unknown;
}

// NFR4 - every task in the list must have a title, valid dueDate, and numeric courseId
export function validateStudyPlanInput(body: StudyPlanInput): string | null {
  if (!Array.isArray(body.tasks) || body.tasks.length === 0) {
    return "tasks must be a non-empty array";
  }
  for (const t of body.tasks as any[]) {
    if (!t.title || typeof t.title !== "string" || !t.title.trim()) {
      return "each task must have a non-empty title";
    }
    if (!t.dueDate || isNaN(Date.parse(t.dueDate))) {
      return "each task must have a valid dueDate";
    }
    if (!t.courseId || isNaN(Number(t.courseId))) {
      return "each task must have a valid courseId";
    }
  }
  return null;
}

// NFR4 - completed must be a boolean, not a string like "true" or a number like 1
export function validateTaskToggle(body: TaskToggleInput): string | null {
  if (typeof body.completed !== "boolean") {
    return "completed must be a boolean";
  }
  return null;
}
