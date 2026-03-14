"use client";

import React, { useEffect, useState } from "react";

export default function SubmissionReviewList({
  assignmentId,
  courseId,
}: {
  assignmentId?: number;
  courseId?: number;
}) {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // track grade/feedback inputs per submission
  const [grades, setGrades] = useState<Record<number, string>>({});
  const [feedbacks, setFeedbacks] = useState<Record<number, string>>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [reviewMsg, setReviewMsg] = useState<Record<number, string>>({});

  async function fetchSubmissions() {
    setLoading(true);
    try {
      let url = "/api/submissions?";
      if (assignmentId) url += `assignmentId=${assignmentId}`;
      else if (courseId) url += `courseId=${courseId}`;

      const res = await fetch(url);
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setSubmissions(list);

      // prefill grade/feedback from existing data
      const g: Record<number, string> = {};
      const f: Record<number, string> = {};
      list.forEach((s: any) => {
        g[s.id] = s.grade !== null ? String(s.grade) : "";
        f[s.id] = s.feedback || "";
      });
      setGrades(g);
      setFeedbacks(f);
    } catch (e) {
      console.error("fetchSubmissions", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSubmissions();
  }, [assignmentId, courseId]);

  async function handleReview(submissionId: number) {
    setSavingId(submissionId);
    setReviewMsg((prev) => ({ ...prev, [submissionId]: "" }));

    try {
      const res = await fetch(`/api/submissions/${submissionId}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grade: grades[submissionId] !== "" ? Number(grades[submissionId]) : null,
          feedback: feedbacks[submissionId]?.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setReviewMsg((prev) => ({ ...prev, [submissionId]: data.error || "Failed to save" }));
        setSavingId(null);
        return;
      }

      // update in state
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === submissionId
            ? { ...s, grade: data.submission.grade, feedback: data.submission.feedback, reviewedAt: data.submission.reviewedAt }
            : s
        )
      );
      setReviewMsg((prev) => ({ ...prev, [submissionId]: "Saved!" }));
    } catch (e) {
      setReviewMsg((prev) => ({ ...prev, [submissionId]: "Failed to save" }));
    } finally {
      setSavingId(null);
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (submissions.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No submissions found.</div>;
  }

  return (
    <ul className="space-y-4">
      {submissions.map((s: any) => {
        const reviewed = !!s.reviewedAt;
        return (
          <li key={s.id} className="p-4 border rounded-lg bg-white shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex-1">
                {/* student info */}
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">{s.student.fullName}</h3>
                  <span className={`text-sm ${reviewed ? "text-emerald-600" : "text-gray-500"}`}>
                    {reviewed ? "Reviewed" : "Pending"}
                  </span>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {s.student.email} • {s.assignment.title} • {s.assignment.course?.title}
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  Submitted: {new Date(s.submittedAt).toLocaleString()}
                </div>

                {/* student answer */}
                <div className="mt-3 p-3 bg-gray-50 rounded text-sm text-gray-800 whitespace-pre-wrap">
                  {s.content || "(empty)"}
                </div>

                {/* review form */}
                <div className="mt-4 flex gap-3">
                  <div style={{ width: 100 }}>
                    <label className="block text-sm font-medium mb-1">Grade</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={grades[s.id] || ""}
                      onChange={(e) => setGrades((prev) => ({ ...prev, [s.id]: e.target.value }))}
                      className="w-full border rounded px-3 py-2"
                      placeholder="0-100"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">Feedback</label>
                    <textarea
                      value={feedbacks[s.id] || ""}
                      onChange={(e) => setFeedbacks((prev) => ({ ...prev, [s.id]: e.target.value }))}
                      className="w-full border rounded px-3 py-2"
                      rows={2}
                      placeholder="Write feedback…"
                    />
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  {reviewMsg[s.id] && (
                    <span className={`text-sm ${reviewMsg[s.id] === "Saved!" ? "text-emerald-600" : "text-red-600"}`}>
                      {reviewMsg[s.id]}
                    </span>
                  )}
                  <button
                    onClick={() => handleReview(s.id)}
                    disabled={savingId === s.id}
                    className={`ml-auto rounded px-3 py-1 text-sm text-white ${savingId === s.id ? "bg-gray-400" : "bg-emerald-600 hover:bg-emerald-500"}`}
                  >
                    {savingId === s.id ? "Saving…" : reviewed ? "Update review" : "Mark as reviewed"}
                  </button>
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
