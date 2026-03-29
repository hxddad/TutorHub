"use client";

// FR6 — dedicated "My Enrolled Courses" page for students

import React, { useEffect, useState } from "react";
import Link from "next/link";

type EnrolledCourse = {
  id: number;
  title: string;
  subject: string;
  level: string | null;
  tutor: { fullName: string };
  _count: { assignments: number };
  enrolledAt: string;
};

export default function StudentCoursesPage() {
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCourses() {
      try {
        const res = await fetch("/api/courses/enrolled");
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
    fetchCourses();
  }, []);

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-8 shadow-lg shadow-slate-200/40 sm:p-10">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500" />
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">
          My courses
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Enrolled Courses
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">
          View the courses you are currently enrolled in, check assignments, and access course details.
        </p>
      </div>

      {/* Content */}
      <div className="mt-8">
        {loading ? (
          <div className="rounded-2xl border border-slate-200/90 bg-white p-8 shadow-md shadow-slate-200/30">
            <p className="text-center text-sm text-slate-400">Loading courses...</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-100 bg-white p-8 shadow-md">
            <p className="text-center text-sm text-red-500">{error}</p>
          </div>
        ) : courses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300/80 bg-slate-50/80 p-8 text-center">
            <p className="text-sm text-slate-500">
              You are not enrolled in any courses yet.{" "}
              <Link href="/courses" className="font-semibold text-emerald-700 hover:underline">
                Browse courses
              </Link>
            </p>
          </div>
        ) : (
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
                  {c.level && (
                    <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                      {c.level}
                    </span>
                  )}
                </div>

                <h3 className="mt-2 text-base font-semibold text-slate-900 leading-snug">
                  {c.title}
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  by {c.tutor?.fullName || "Unknown tutor"}
                </p>

                <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {c._count?.assignments || 0} assignment{(c._count?.assignments || 0) !== 1 ? "s" : ""}
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Enrolled {new Date(c.enrolledAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="mt-auto flex items-center gap-2 pt-5">
                  <Link
                    href={`/courses/${c.id}`}
                    className="inline-flex items-center rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-500"
                  >
                    View course
                    <span className="ml-1 transition group-hover:translate-x-0.5" aria-hidden>
                      →
                    </span>
                  </Link>
                  <Link
                    href={`/dashboard/student/assignments?courseId=${c.id}`}
                    className="inline-flex items-center rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                  >
                    Assignments
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Back link */}
      <div className="mt-8 rounded-2xl border border-dashed border-slate-300/80 bg-slate-50/80 p-6 text-center">
        <p className="text-sm text-slate-600">
          <Link
            href="/dashboard/student"
            className="font-semibold text-emerald-700 hover:text-emerald-600 hover:underline"
          >
            &larr; Back to Dashboard
          </Link>
        </p>
      </div>
    </div>
  );
}
