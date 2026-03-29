"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateAssignmentForm({ onCreated }: { onCreated?: () => void }) {
  const router = useRouter();
  const [courses, setCourses] = useState<any[]>([]);
  const [courseId, setCourseId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loadingCourses, setLoadingCourses] = useState(true);

  useEffect(() => {
    // load tutor's courses so they can pick one
    fetch("/api/courses/mine")
      .then((res) => res.json())
      .then((data) => {
        setCourses(Array.isArray(data) ? data : []);
        setLoadingCourses(false);
      })
      .catch((err) => {
        console.error("couldnt load courses", err);
        setLoadingCourses(false);
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!courseId || !title.trim()) {
      setError("Please select a course and enter a title.");
      return;
    }

    // check due date is in the future
    if (dueDate && new Date(dueDate) < new Date()) {
      setError("Due date cannot be in the past.");
      setSaving(false);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: Number(courseId),
          title: title.trim(),
          description: description.trim() || null,
          dueDate: dueDate || null,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "Failed to create assignment");
        setSaving(false);
        return;
      }

      setSuccess(`Assignment "${data.title}" created!`);
      setTitle("");
      setDescription("");
      setDueDate("");
      if (onCreated) onCreated();
    } catch (e) {
      setError("Failed to create assignment");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl mx-auto p-4 bg-white rounded-lg shadow-sm space-y-4">
      {error && <div className="text-sm text-red-600">{error}</div>}
      {success && <div className="text-sm text-emerald-600">{success}</div>}

      <div>
        <label className="block text-sm font-medium mb-1">Course</label>
        {loadingCourses ? (
          <p className="text-sm text-gray-500">Loading courses…</p>
        ) : courses.length === 0 ? (
          <p className="text-sm text-gray-500">
            No courses found. You need to create a course first.
          </p>
        ) : (
          <select
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 py-2.5 pr-10 text-sm text-slate-900 shadow-sm transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 cursor-pointer"
          >
            <option value="">Select a course</option>
            {courses.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.title} ({c.subject})
              </option>
            ))}
          </select>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border rounded px-3 py-2" />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full border rounded px-3 py-2" rows={3} />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Due Date</label>
        <input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} min={new Date().toISOString().slice(0, 16)} className="w-full border rounded px-3 py-2" />
      </div>

      <div className="flex justify-end">
        <button type="submit" disabled={saving || courses.length === 0} className="rounded bg-emerald-600 text-white px-4 py-2">
          {saving ? "Saving…" : "Create assignment"}
        </button>
      </div>
    </form>
  );
}
