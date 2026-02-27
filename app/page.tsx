import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default function DashboardPage() {
  const hdrs = headers();
  const role = (hdrs.get("x-user-role") || "").toLowerCase();

  if (!role) redirect("/login");
  if (role === "student") redirect("/dashboard/student");
  if (role === "tutor") redirect("/dashboard/tutor");
  if (role === "admin") redirect("/dashboard/admin");

  redirect("/login");
}
