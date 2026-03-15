import AssignmentList from "@/components/AssignmentList";
import Link from "next/dist/client/link";
import CreateAssignmentForm from "@/components/CreateAssignmentForm";

export default function CreateAssignmentPage() {
  return (
    <main className="py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-2xl font-semibold mb-4">Create Assignment</h1>
        {/* Reuse your form component */}
        <CreateAssignmentForm />
        <Link href="/dashboard/tutor/assignments" className="text-sm text-emerald-600 hover:underline">
          ← Back to Assignment
        </Link>
      </div>


    </main>
  );
}