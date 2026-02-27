// We wrap all dashboard pages with this layout and background.
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-slate-50 via-emerald-50/40 to-blue-50/50">
      {children}
    </div>
  );
}
