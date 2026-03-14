"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import SubmissionReviewList from "@/components/SubmissionReviewList";

export default function TutorSubmissionsPage() {
  const searchParams = useSearchParams();
  const assignmentIdParam = Number(searchParams.get("assignmentId") || 0);
  const courseIdParam = Number(searchParams.get("courseId") || 0);

  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<number | null>(courseIdParam || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/courses/mine")
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setCourses(list);
        if (!assignmentIdParam && !courseIdParam && list.length > 0) {
          setSelectedCourse(list[0].id);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [assignmentIdParam, courseIdParam]);

  // if theres an assignmentId in the url, just show that assignments submissions
  if (assignmentIdParam) {
    return (
      <main className="py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-semibold">Review Submissions</h1>
            <Link href="/dashboard/tutor/assignments" className="text-sm text-emerald-600 hover:underline">
              ← Back to assignments
            </Link>
          </div>
          <SubmissionReviewList assignmentId={assignmentIdParam} />
        </div>
      </main>
    );
  }

  return (
    <main className="py-8">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Review Submissions</h1>
          <Link href="/dashboard/tutor" className="text-sm text-emerald-600 hover:underline">
            ← Back to dashboard
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : courses.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No courses yet.</div>
        ) : (
          <div className="max-w-4xl mx-auto p-4">
            <div className="mb-4">
              <label className="sr-only" htmlFor="courseFilter">Filter by course</label>
              <select
                id="courseFilter"
                value={selectedCourse ?? ""}
                onChange={(e) => setSelectedCourse(Number(e.target.value))}
                className="border rounded-md px-3 py-1 shadow-sm"
              >
                {courses.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>

            {selectedCourse && <SubmissionReviewList courseId={selectedCourse} />}
          </div>
        )}
      </div>
    </main>
  );
}
