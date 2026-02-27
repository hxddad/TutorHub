import Link from "next/link";
import { headers } from "next/headers";
import CreateCourseForm from "@/components/CreateCourseForm";

export default function TutorDashboardPage() {
  const hdrs = headers();
  const userId = hdrs.get("x-user-id") || "";

  return (
    <main className="py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-2xl font-semibold mb-4">Tutor Dashboard — Create a course</h1>
        <CreateCourseForm tutorId={userId} />
      </div>
    </main>
  );
}
