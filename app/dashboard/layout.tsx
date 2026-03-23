import { headers } from "next/headers";
import DashboardFrame from "@/components/DashboardFrame";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const hdrs = headers();
  const role = hdrs.get("x-user-role") || "STUDENT";

  return <DashboardFrame role={role}>{children}</DashboardFrame>;
}
