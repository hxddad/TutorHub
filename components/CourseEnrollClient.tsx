"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function CourseEnrollClient({
  courseId,
  isPublished,
  capacity,
  enrolledCount,
  initiallyJoined,
}: {
  courseId: number;
  isPublished: boolean;
  capacity: number | null;
  enrolledCount: number;
  initiallyJoined?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [joined, setJoined] = useState<boolean>(!!initiallyJoined);

  const hasSpace = capacity == null || enrolledCount < capacity;

  async function handleEnroll() {
    if (joined) return;
    setErr(null);
    setMsg(null);

    // quick client-side auth check: token in localStorage or cookie
    const hasToken =
      (typeof window !== "undefined" && !!window.localStorage.getItem("token")) ||
      (typeof document !== "undefined" && document.cookie.includes("authToken="));
    if (!hasToken) {
      setErr("Please log in as a student to enroll.");
      setTimeout(() => router.push("/login"), 700);
      return;
    }

    if (!isPublished) {
      setErr("Course is not available for enrollment.");
      return;
    }
    if (!hasSpace) {
      setErr("Course is full.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok && !data.success) {
        setErr(data.error || "Failed to enroll");
        setLoading(false);
        return;
      }
      setMsg(data.error ? String(data.error) : "Enrolled successfully");
      setJoined(true);
      router.refresh();
    } catch (e) {
      setErr("Failed to enroll");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {err && <div className="text-sm text-red-600">{err}</div>}
      {msg && <div className="text-sm text-emerald-600">{msg}</div>}
      <button
        onClick={handleEnroll}
        disabled={loading || joined || !isPublished || (capacity !== null && enrolledCount >= capacity)}
        className={`rounded px-3 py-1 text-sm text-white ${joined || loading ? "bg-gray-400" : "bg-emerald-600 hover:bg-emerald-500"}`}
      >
        {joined ? "Enrolled" : loading ? "Enrolling…" : "Enroll"}
      </button>
    </div>
  );
}