"use client";

import React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import SubmissionForm from "@/components/SubmissionForm";

export default function StudentAssignmentDetailPage() {
  const params = useParams();
  const id = Number(params.id);

  if (!id || Number.isNaN(id)) {
    return <div className="p-6">Invalid assignment id</div>;
  }

  return (
    <main className="py-8">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="mb-6">
          <Link href="/dashboard/student/assignments" className="inline-flex items-center rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50">
            &larr; Back to assignments
          </Link>
        </div>
        <SubmissionForm assignmentId={id} />
      </div>
    </main>
  );
}
