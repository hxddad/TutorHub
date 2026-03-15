"use client";
import React, { useEffect, useState } from "react";

type Assignment = {
  id: number;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  createdAt: string;
  course: { id: number; title: string; subject: string };
  _count: { submissions: number };
};

export default function AssignmentList({
  courseId,
  role,
}: {
  courseId: number;
  role: "STUDENT" | "TUTOR";
}) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  async function fetchAssignments() {
    setLoading(true);
    try {
      const res = await fetch(`/api/assignments?courseId=${courseId}`);
      const data = await res.json();
      setAssignments(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("fetchAssignments", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAssignments();
  }, [courseId]);

  return (
    <div>
      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : assignments.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">No assignments found.</div>
      ) : (
        <ul className="space-y-4">
          {assignments.map((a) => {
            const isPastDue = a.dueDate && new Date(a.dueDate) < new Date();
            return (
              <li key={a.id} className="p-4 border rounded-lg bg-white shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">{a.title}</h3>
                      <span className={`text-sm ${isPastDue ? "text-red-500 font-medium" : "text-gray-600"}`}>
                        {a.dueDate ? new Date(a.dueDate).toLocaleString() : "No due date"}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mt-1">
                      {a.description ? a.description.slice(0, 180) : "No description"}
                    </p>
                    <div className="mt-3 flex items-center gap-4 text-sm text-gray-600">
                      <span>{a._count?.submissions || 0} submission(s)</span>
                      <span>•</span>
                      <span>Posted {new Date(a.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {role === "STUDENT" && (
                      <a
                        className="inline-block bg-emerald-600 text-white px-3 py-1 rounded-md text-sm"
                        href={`/dashboard/student/assignments/${a.id}`}
                      >
                        View / Submit
                      </a>
                    )}
                    {role === "TUTOR" && (
                      <a
                        className="inline-block bg-emerald-600 text-white px-3 py-1 rounded-md text-sm"
                        href={`/dashboard/tutor/submissions?assignmentId=${a.id}`}
                      >
                        Review ({a._count?.submissions || 0})
                      </a>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
