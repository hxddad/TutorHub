import CreateCourseForm from "@/components/CreateCourseForm";
import { headers } from "next/dist/client/components/headers";
import Link from "next/dist/client/link";

export default function CreateAssignmentPage() {
    const hdrs = headers();
    const userId = hdrs.get("x-user-id") || "";

    return (
        <main className="py-8">
            <div className="container mx-auto px-4">


                <h2 className="text-lg font-semibold mb-4">Create a new course</h2>
                <CreateCourseForm tutorId={userId} />

                <Link href="/dashboard/tutor" className="text-sm text-emerald-600 hover:underline">
                    ← Back to Dashboard
                </Link>
            </div>
        </main >
    );
}