import Link from "next/link";
import StudyPlanForm from "@/components/StudyPlanForm";
import { verifyToken } from "@/lib/jwt";
import { cookies } from "next/headers";

export default async function CreateStudyPlanPage() {
  
  try {
    const token = cookies().get("authToken")?.value;
    if (!token) return <p>Please log in</p>;

    const payload = verifyToken(token);
    if (!payload || payload.role !== "STUDENT") return <p>Forbidden</p>;

    return (
      <main className="p-8">
        {/* Header + Back link */}
        <div className="container mx-auto px-4 mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Create Study Plan</h1>
          <Link
            href="/dashboard/student"
            className="text-sm text-emerald-600 hover:underline"
          >
            ← Back to dashboard
          </Link>
        </div>

        {/* Form */}
        <div className="container mx-auto px-4">
          <StudyPlanForm />
        </div>
      </main>
    );
  } catch (err) {
    console.error("Error verifying token:", err);
    return <p>Error verifying user</p>;
  }
}