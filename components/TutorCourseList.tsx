"use client";

// TutorCourseList.tsx
// FR5 — lists the tutor's courses with edit/archive actions

import React, { useEffect, useState } from "react";
import Link from "next/link";

type Course = {
  id: number;
  title: string;
  subject: string;
  isPublished: boolean;
  _count: { enrollments: number; assignments: number };
};

export default function TutorCourseList() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<number | null>(null);

  async function fetchCourses() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/courses/mine");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to load courses");
        return;
      }
      const data = await res.json();
      setCourses(Array.isArray(data) ? data : []);
    } catch {
      setError("Failed to load courses");
    } finally {
      setLoading(false);
    }
  }

  async function handleArchive(courseId: number) {
    if (!confirm("Archive this course? Students will no longer see it.")) return;
    setArchivingId(courseId);
    try {
      const res = await fetch(`/api/courses?id=${courseId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to archive course");
        return;
      }
      setCourses((prev) =>
        prev.map((c) => (c.id === courseId ? { ...c, isPublished: false } : c))
      );
    } catch {
      alert("Failed to archive course");
    } finally {
      setArchivingId(null);
    }
  }

  useEffect(() => {
    fetchCourses();
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200/90 bg-white p-8 shadow-md shadow-slate-200/30">
        <p className="text-center text-sm text-slate-400">Loading courses...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-100 bg-white p-8 shadow-md">
        <p className="text-center text-sm text-red-500">{error}</p>
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300/80 bg-slate-50/80 p-8 text-center">
        <p className="text-sm text-slate-500">No courses yet. Create your first course below.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {courses.map((c) => (
        <div
          key={c.id}
          className="group flex flex-col rounded-2xl border border-slate-200/90 bg-white p-5 shadow-md shadow-slate-200/30 transition hover:border-emerald-200/80 hover:shadow-lg hover:shadow-emerald-100/40"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">
              {c.subject}
            </p>
            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                c.isPublished
                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                  : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
              }`}
            >
              {c.isPublished ? "Published" : "Draft"}
            </span>
          </div>

          <h3 className="mt-2 text-base font-semibold text-slate-900 leading-snug">
            {c.title}
          </h3>

          <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {c._count.enrollments} enrolled
            </span>
            <span className="flex items-center gap-1">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {c._count.assignments} assignment{c._count.assignments !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="mt-auto flex items-center gap-2 pt-5">
            <Link
              href={`/dashboard/tutor/courses/${c.id}/edit`}
              className="inline-flex items-center rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-500"
            >
              Edit
              <span className="ml-1 transition group-hover:translate-x-0.5" aria-hidden>
                →
              </span>
            </Link>
            {c.isPublished && (
              <button
                onClick={() => handleArchive(c.id)}
                disabled={archivingId === c.id}
                className="inline-flex items-center rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
              >
                {archivingId === c.id ? "Archiving..." : "Archive"}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
