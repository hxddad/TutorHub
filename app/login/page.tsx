import LoginForm from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-slate-50 via-emerald-50/40 to-blue-50/50 flex flex-col items-center justify-center px-4 py-12 sm:py-16">
      <div className="w-full max-w-[420px]">
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/50 overflow-hidden">
          <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 to-emerald-600" />
          <div className="p-8 sm:p-10">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Welcome back
          </h1>
          <p className="mt-1.5 text-slate-600 text-sm">
            Log in to your TutorHub account to continue.
          </p>
          <div className="mt-8">
            <LoginForm />
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
