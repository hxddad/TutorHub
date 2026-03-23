"use client";

import AssignmentList from "@/components/AssignmentList";
import CreateAssignmentForm from "@/components/CreateAssignmentForm";
import Link from "next/dist/client/link";
import { useEffect, useState } from "react";

export default function ReviewAssignmentsPage() {

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
        <h1 className="text-2xl font-semibold mb-4">Review Assignments</h1>
        <div className="max-w-4xl mx-auto p-4">
          <h2 className="text-2xl font-semibold mb-4">Your course assignments</h2>

          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : courses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No courses yet. Create a course first from your{" "}
              <Link href="/dashboard/tutor" className="text-emerald-600 hover:underline">dashboard</Link>.
            </div>
          ) : (
            <>
              <div className="mb-4">
                <label className="sr-only" htmlFor="courseSelect">Filter by course</label>
                <select
                  id="courseSelect"
                  value={selectedCourse ?? ""}
                  onChange={(e) => setSelectedCourse(Number(e.target.value))}
                  className="border rounded-md px-3 py-1 shadow-sm"
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

        <Link href="/dashboard/tutor/assignments" className="text-sm text-emerald-600 hover:underline">
            ← Back to Assignment
          </Link>
      </div>
    </main>
  );
}