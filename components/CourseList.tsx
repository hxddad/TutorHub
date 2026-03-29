"use client";
import React, { useEffect, useState } from "react";

type Tutor = { id: string; fullName: string; avatar?: string | null };
type Course = {
  id: number;
  title: string;
  subject: string;
  description?: string | null;
  price?: number | null;
  level?: string | null;
  averageRating?: number | null;
  tutor: Tutor;
};

export default function CourseList() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [subject, setSubject] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  async function fetchCourses(subjectFilter = "") {
    setLoading(true);
    try {
      const q = subjectFilter ? `?subject=${encodeURIComponent(subjectFilter)}` : "";
      const res = await fetch(`/api/courses${q}`);
      const data = await res.json();
      setCourses(data || []);
      const uniq = Array.from(new Set((data || []).map((c: Course) => c.subject))).sort() as string[];
      setSubjects(uniq);
    } catch (e) {
      console.error("fetchCourses", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    // when subject changes, refetch
    fetchCourses(subject);
  }, [subject]);

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">Browse Courses</h2>
        <div>
          <label className="sr-only" htmlFor="subject">Filter by subject</label>
          <select
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="appearance-none rounded-xl border border-slate-300 bg-white px-4 py-2.5 pr-10 text-sm text-slate-900 shadow-sm transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 cursor-pointer"
          >
            <option value="">All subjects</option>
            {subjects.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : courses.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">No courses found.</div>
      ) : (
        <ul className="space-y-4">
          {courses.map((course) => (
            <li key={course.id} className="p-4 border rounded-lg bg-white shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">{course.title}</h3>
                    <span className="text-sm text-gray-600">{course.level || "Any level"}</span>
                  </div>
                  <p className="text-sm text-gray-700 mt-1">
                    {course.description ? course.description.slice(0, 180) : "No description"}
                  </p>
                  <div className="mt-3 flex items-center gap-4 text-sm text-gray-600">
                    <span className="font-medium">{course.subject}</span>
                    <span>•</span>
                    <span>{course.tutor?.fullName || "Unknown tutor"}</span>
                    {typeof course.price === "number" && <><span>•</span><span>${course.price.toFixed(2)}</span></>}
                    {typeof course.averageRating === "number" && <><span>•</span><span>⭐ {course.averageRating}</span></>}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <a
                    className="inline-block bg-emerald-600 text-white px-3 py-1 rounded-md text-sm"
                    href={`/courses/${course.id}`}
                  >
                    View
                  </a>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}