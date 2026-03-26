"use client";

import { useEffect, useState } from "react";

type Task = { title: string; courseId: string; dueDate: string; completed?:boolean;};
type Course = { id: string; title: string; };

// type StudyPlanFormProps = { studentId: string };
type StudyPlanFormProps = {
  studentId: string;
  initialTasks?: any[];
  planId?: number;
};

export default function StudyPlanForm({ studentId, initialTasks, planId }: StudyPlanFormProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  // const [tasks, setTasks] = useState<Task[]>([{ title: "", courseId: "", dueDate: "" }]);
  const [tasks, setTasks] = useState<Task[]>(
    (initialTasks ?? []).map((t) => ({
      title: t.title,
      courseId: String(t.courseId),
      dueDate: new Date(t.dueDate).toISOString().slice(0, 10),
      completed: t.completed ?? false,
    })) || [{ title: "", courseId: "", dueDate: "", completed:false }]
  );
  
  useEffect(() => {


    async function loadCourses() {
      try {
        const res = await fetch(`/api/courses/enrolled?studentId=${studentId}`);
        const data = await res.json();
        if (Array.isArray(data)) setCourses(data);
        else setCourses([]);
      } catch (err) {
        console.error("Failed to load enrolled courses:", err);
        setCourses([]);
      }
    }

    loadCourses();
  }, [studentId]);


  const handleTaskChange = (index: number, field: keyof Task, value: string) => {
    const updated = [...tasks];
    updated[index] = { ...updated[index], [field]: value };
    setTasks(updated);
  };

  const addTask = () => setTasks([...tasks, { title: "", courseId: "", dueDate: "" }]);
  

  const savePlan = async () => {
  for (const t of tasks) {
    if (!t.title || !t.courseId || !t.dueDate) {
      alert("Please fill all fields for each task");
      return;
    }
  }

  try {
    const method = planId ? "PUT" : "POST";

    const body = planId
      ? {
          planId,
          tasks: tasks.map((t) => ({
            title: t.title,
            courseId: t.courseId,
            dueDate: t.dueDate,
            completed: t.completed ?? false,
          })),
        }
      : {
          studentId,
          tasks: tasks.map((t) => ({
            title: t.title,
            courseId: t.courseId,
            dueDate: t.dueDate,
            completed: t.completed ?? false,
          })),
        };

    const res = await fetch("/api/study-plans", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error("Failed to save");

    alert(planId ? "Study plan updated!" : "Study plan created!");

    // Reset the form after saving the study plan 
    if (!planId) {
      setTasks([{ title: "", courseId: "", dueDate: "" }]);
}
  } catch (err) {
    console.error(err);
    alert("Error saving study plan");
  }
};

  return (
    <div>
      {tasks.map((t, i) => (
        <div key={i} className="mb-4 border p-2 rounded flex gap-2 items-center">
          <input
            placeholder="Task title"
            value={t.title}
            onChange={(e) => handleTaskChange(i, "title", e.target.value)}
            className="border rounded px-2 py-1 flex-1"
          />
          <select
            value={t.courseId}
            onChange={(e) => handleTaskChange(i, "courseId", e.target.value)}
            className="border rounded px-2 py-1 flex-1"
          >
            <option value="">Select course</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
          <input
            type="date"
            value={t.dueDate}
            onChange={(e) => handleTaskChange(i, "dueDate", e.target.value)}
            className="border rounded px-2 py-1 flex-1"
          />

           {/* Add checkbox to mark task as completed
          <input
            type="checkbox"
            checked={t.completed || false}
            onChange={(e) => {
              const updated = [...tasks];
              updated[i] = { ...updated[i], completed: e.target.checked };
              setTasks(updated);
            }}
          /> */}

           {/* Delete button to delete a task 
          <button
            onClick={() => {
              const updated = tasks.filter((_, idx) => idx !== i);
              setTasks(updated);
            }}
            className="text-red-500 font-bold px-2"
          >
            ✕
          </button> */}
        </div>
      ))}
      <div className="flex gap-2">
        <button onClick={addTask} className="bg-blue-600 text-white px-3 py-1 rounded">+ Add Task</button>
        <button onClick={savePlan} className="bg-green-600 text-white px-3 py-1 rounded">Save Plan</button>
      </div>
    </div>
  );
}