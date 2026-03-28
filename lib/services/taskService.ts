// taskService.ts
// Business logic for task completion toggles
// NFR15 - keeps the ownership check out of the route handler

import * as taskRepo from "@/lib/repositories/taskRepository";
import { validateTaskToggle } from "@/lib/validators";

// FR14 + NFR1 + NFR2 + NFR4 - toggle a task's completed status
// we load the task first so we can verify the student actually owns its parent plan
export async function toggleTask(taskId: number, studentId: string, body: any) {
  // NFR4 - completed must be a boolean
  const error = validateTaskToggle(body);
  if (error) throw { status: 400, message: error };

  // NFR2 - load the task and join to its study plan to check ownership
  const task = await taskRepo.findTaskWithPlan(taskId);
  if (!task) throw { status: 404, message: "Task not found" };

  // NFR2 - the student sending this request must own the plan the task belongs to
  if (task.studyPlan.studentId !== studentId) {
    throw { status: 403, message: "Forbidden: you do not own this task" };
  }

  return taskRepo.toggleTaskCompleted(taskId, body.completed);
}
