// app/api/tasks/[id]/route.ts
// Handles toggling a task's completed status
// FR14 (task completion), NFR1 (auth), NFR2 (ownership)

import { NextResponse } from "next/server";
import { requireStudent, isAuthError } from "@/lib/api-auth";
import * as taskService from "@/lib/services/taskService";

// FR14 + NFR1 + NFR2 + NFR4 - mark a task as complete or incomplete
// before updating, we verify the task belongs to a plan owned by the logged-in student
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    // NFR1 - only students should be toggling task completion
    const auth = requireStudent(req);
    if (isAuthError(auth)) return auth;

    const taskId = Number(params.id);
    if (isNaN(taskId)) return NextResponse.json({ error: "Invalid task id" }, { status: 400 });

    const body = await req.json().catch(() => ({}));

    // NFR2 - taskService loads the task, joins to its study plan, and checks studentId
    // this prevents a student from toggling tasks they don't own
    const updatedTask = await taskService.toggleTask(taskId, auth.sub, body);
    return NextResponse.json(updatedTask);
  } catch (err: any) {
    if (err?.status) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("PATCH /api/tasks/[id] error", err);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}
