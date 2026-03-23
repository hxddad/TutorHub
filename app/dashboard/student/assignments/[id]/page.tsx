"use client";

import React from "react";
import { useParams } from "next/navigation";
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
        <SubmissionForm assignmentId={id} />
      </div>
    </main>
  );
}
