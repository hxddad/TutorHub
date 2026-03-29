"use client";

// FR17 — admin workspace with real platform stats

import Link from "next/link";
import { useEffect, useState } from "react";

type Stats = {
  users: { total: number; students: number; tutors: number; admins: number };
  courses: { total: number; published: number; archived: number };
  enrollments: number;
  assignments: number;
  submissions: { total: number; graded: number; pending: number };
  recentUsers: { id: string; fullName: string; email: string; role: string; createdAt: string }[];
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/admin/stats");
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error || "Failed to load stats");
          return;
        }
        setStats(await res.json());
      } catch {
        setError("Failed to load stats");
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-8 shadow-lg shadow-slate-200/40 sm:p-10">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-slate-700 via-emerald-600 to-teal-500" />
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Administration
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Platform overview
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">
          Live platform statistics and recent activity across users, courses, and assessments.
        </p>
      </div>

      {loading ? (
        <div className="mt-10 rounded-2xl border border-slate-200/90 bg-white p-8 shadow-md">
          <p className="text-center text-sm text-slate-400">Loading stats...</p>
        </div>
      ) : error ? (
        <div className="mt-10 rounded-2xl border border-red-100 bg-white p-8 shadow-md">
          <p className="text-center text-sm text-red-500">{error}</p>
        </div>
      ) : stats ? (
        <>
          {/* Stats tiles */}
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-md shadow-slate-200/25">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total users</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{stats.users.total}</p>
              <div className="mt-2 flex gap-3 text-xs text-slate-500">
                <span>{stats.users.students} students</span>
                <span>{stats.users.tutors} tutors</span>
                <span>{stats.users.admins} admins</span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-md shadow-slate-200/25">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Courses</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{stats.courses.total}</p>
              <div className="mt-2 flex gap-3 text-xs text-slate-500">
                <span className="text-emerald-600">{stats.courses.published} published</span>
                <span className="text-amber-600">{stats.courses.archived} archived</span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-md shadow-slate-200/25">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Enrollments</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{stats.enrollments}</p>
              <p className="mt-2 text-xs text-slate-500">Active enrollments</p>
            </div>

            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-md shadow-slate-200/25">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Submissions</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{stats.submissions.total}</p>
              <div className="mt-2 flex gap-3 text-xs text-slate-500">
                <span className="text-emerald-600">{stats.submissions.graded} graded</span>
                <span className="text-amber-600">{stats.submissions.pending} pending</span>
              </div>
            </div>
          </div>

          {/* Secondary stats */}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-md shadow-slate-200/25">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Assignments</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{stats.assignments}</p>
              <p className="mt-2 text-xs text-slate-500">Total across all courses</p>
            </div>

            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-md shadow-slate-200/25">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Platform</p>
              <p className="mt-2 text-3xl font-bold text-emerald-600">Live</p>
              <p className="mt-2 text-xs text-slate-500">TutorHub environment</p>
            </div>
          </div>

          {/* Recent users */}
          <div className="mt-8">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Recent registrations</h2>
            <div className="rounded-2xl border border-slate-200/90 bg-white shadow-md shadow-slate-200/25 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Name</th>
                    <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Email</th>
                    <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Role</th>
                    <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentUsers.map((u) => (
                    <tr key={u.id} className="border-b border-slate-50 last:border-0">
                      <td className="px-5 py-3 font-medium text-slate-900">{u.fullName}</td>
                      <td className="px-5 py-3 text-slate-600">{u.email}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            u.role === "ADMIN"
                              ? "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
                              : u.role === "TUTOR"
                              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                              : "bg-sky-50 text-sky-700 ring-1 ring-sky-200"
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-500">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}

      {/* Quick links */}
      <div className="mt-10 flex flex-wrap gap-4">
        <Link
          href="/courses"
          className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50/50"
        >
          Browse course catalog
        </Link>
        <Link
          href="/dashboard/admin/messages"
          className="inline-flex items-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-slate-800"
        >
          Open messages
        </Link>
      </div>
    </div>
  );
}
