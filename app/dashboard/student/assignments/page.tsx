"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import AssignmentList from "@/components/AssignmentList";

export default function StudentAssignmentsPage() {
  const searchParams = useSearchParams();
  const courseIdParam = Number(searchParams.get("courseId") || 0);

  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<number | null>(courseIdParam || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/courses/enrolled")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      })
      .then((data) => {
        setCourses(data);
        if (courseIdParam && data.some((c: any) => c.id === courseIdParam)) {
          setSelectedCourse(courseIdParam);
        } else if (data.length > 0 && !courseIdParam) {
          setSelectedCourse(data[0].id);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [courseIdParam]);

  return (
    <main className="py-8">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">My Assignments</h1>
          <Link href="/dashboard/student" className="inline-flex items-center rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50">
            &larr; Back to dashboard
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : courses.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            You are not enrolled in any courses yet.{" "}
            <Link href="/courses" className="text-emerald-600 hover:underline">Browse courses</Link>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto p-4">
            <div className="mb-4">
              <label className="sr-only" htmlFor="courseSelect">Filter by course</label>
              <select
                id="courseSelect"
                value={selectedCourse ?? ""}
                onChange={(e) => setSelectedCourse(Number(e.target.value))}
                className="appearance-none rounded-xl border border-slate-300 bg-white px-4 py-2.5 pr-10 text-sm text-slate-900 shadow-sm transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 cursor-pointer"
              >
                {courses.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.title} ({c._count?.assignments || 0} assignments)
                  </option>
                ))}
              </select>
            </div>

            {selectedCourse && <AssignmentList courseId={selectedCourse} role="STUDENT" />}
          </div>
        )}
      </div>
    </main>
  );
}
