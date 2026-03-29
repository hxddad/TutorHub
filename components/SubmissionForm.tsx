"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

export default function SubmissionForm({ assignmentId }: { assignmentId: number }) {
  const [assignment, setAssignment] = useState<any>(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/assignments/${assignmentId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Could not load assignment");
        return res.json();
      })
      .then((data) => {
        setAssignment(data);
        // prefill if student already submitted before
        if (data.submissions && data.submissions.length > 0 && data.submissions[0].content) {
          setContent(data.submissions[0].content);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load assignment");
        setLoading(false);
      });
  }, [assignmentId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!content.trim()) {
      setError("Please enter your submission.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId, content: content.trim() }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok && !data.success) {
        setError(data.error || "Submission failed");
        setSubmitting(false);
        return;
      }

      setSuccess(data.resubmitted ? "Resubmission saved!" : "Submitted successfully!");

      // reload assignment to show updated status
      const refreshRes = await fetch(`/api/assignments/${assignmentId}`);
      if (refreshRes.ok) {
        setAssignment(await refreshRes.json());
      }
    } catch (e) {
      setError("Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="text-center py-8">Loading...</div>;

  if (!assignment) {
    return <div className="p-6 text-sm text-red-600">{error || "Assignment not found"}</div>;
  }

  const existingSub = assignment.submissions && assignment.submissions.length > 0
    ? assignment.submissions[0]
    : null;
  const isReviewed = existingSub && existingSub.reviewedAt;
  const isPastDue = assignment.dueDate && new Date(assignment.dueDate) < new Date();

  return (
    <div className="space-y-6">
      {/* assignment details - matches course detail page style */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h1 className="text-2xl font-semibold mb-2">{assignment.title}</h1>
        <div className="text-sm text-gray-600 mb-4">
          {assignment.course.subject} • {assignment.course.title}
        </div>
        <p className="text-gray-700 mb-4">{assignment.description ?? "No description provided."}</p>

        <div className="text-sm text-gray-600">
          <span className={isPastDue ? "text-red-500 font-medium" : ""}>
            Due: {assignment.dueDate ? new Date(assignment.dueDate).toLocaleString() : "No due date"}
          </span>
          {` • Posted: ${new Date(assignment.createdAt).toLocaleDateString()}`}
        </div>

        <div className="mt-4">
          <Link href={`/dashboard/student/assignments?courseId=${assignment.course.id}`} className="text-sm text-emerald-600 hover:underline">
            ← Back to assignments
          </Link>
        </div>
      </div>

      {/* tutor feedback if reviewed */}
      {existingSub && isReviewed && (
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-medium mb-2">Tutor Feedback</h2>
          <div className="text-sm text-gray-600 mb-2">
            Grade: <span className="font-medium">{existingSub.grade !== null ? existingSub.grade : "N/A"}</span>
            {` • Reviewed: ${new Date(existingSub.reviewedAt).toLocaleString()}`}
          </div>
          {existingSub.feedback && (
            <p className="text-gray-700">{existingSub.feedback}</p>
          )}
        </div>
      )}

      {/* pending notice */}
      {existingSub && !isReviewed && (
        <div className="text-sm text-gray-600 px-1">
          Your submission is pending review (submitted {new Date(existingSub.submittedAt).toLocaleString()}).
        </div>
      )}

      {/* submission form - matches CreateCourseForm structure */}
      <form onSubmit={handleSubmit} className="max-w-xl mx-auto p-4 bg-white rounded-lg shadow-sm space-y-4">
        <h2 className="text-lg font-medium">
          {existingSub ? "Update your submission" : "Submit your work"}
        </h2>

        {error && <div className="text-sm text-red-600">{error}</div>}
        {success && <div className="text-sm text-emerald-600">{success}</div>}

        <div>
          <label className="block text-sm font-medium mb-1">Your answer</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full border rounded px-3 py-2"
            rows={6}
            placeholder="Type your answer here…"
          />
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={submitting} className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed">
            {submitting ? "Submitting…" : existingSub ? "Resubmit" : "Submit"}
          </button>
        </div>
      </form>
    </div>
  );
}
