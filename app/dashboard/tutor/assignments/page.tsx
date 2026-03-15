"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import CreateAssignmentForm from "@/components/CreateAssignmentForm";
import AssignmentList from "@/components/AssignmentList";

export default function TutorAssignmentsPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetch("/api/courses/mine")
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setCourses(list);
        if (list.length > 0) setSelectedCourse(list[0].id);
        setLoading(false);
      })
      .catch((err) => {
        console.error("error loading courses:", err);
        setLoading(false);
      });
  }, []);

  return (

    <main className="py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <h1 className="text-2xl font-semibold mb-4 sm:mb-0">Assignments</h1>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/tutor/assignments/create-assignments"
              className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700"
            >
              Create Assignments
            </Link>
            <Link
              href="/dashboard/tutor/assignments/review-assignments"
              className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700"
            >
              Review Assignments
            </Link>
          </div>
        </div>

        <Link
          href="/dashboard/tutor"
          className="text-sm text-emerald-600 hover:underline mb-6 inline-block"
        >
          ← Back to dashboard
        </Link>

        {/* Course filter */}
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading courses…</div>
        ) : courses.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No courses yet. Create a course first from your{" "}
            <Link href="/dashboard/tutor" className="text-emerald-600 hover:underline">
              dashboard
            </Link>.
          </div>
        ) : (
          <>
            <div className="max-w-4xl mx-auto mb-6">
              <label htmlFor="courseSelect" className="block text-sm font-medium mb-1">
                Filter by course
              </label>
              <select
                id="courseSelect"
                value={selectedCourse ?? ""}
                onChange={(e) => setSelectedCourse(Number(e.target.value))}
                className="w-full border rounded-md px-3 py-2 shadow-sm"
              >
                {courses.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.title} ({c._count?.assignments || 0} assignments)
                  </option>
                ))}
              </select>
            </div>

            {selectedCourse && (
              <AssignmentList key={refreshKey} courseId={selectedCourse} role="TUTOR" />
            )}
          </>
        )}
      </div>
    </main>
  );
}
