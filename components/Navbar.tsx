import Image from "next/image";
import Link from "next/link";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-sm shadow-sm">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/tutorhub-logo.png"
            alt="TutorHub - Structured tutoring, one hub."
            width={160}
            height={52}
            className="h-9 w-auto sm:h-10"
            priority
          />
        </Link>
        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            href="/login"
            className="text-sm font-medium text-slate-600 hover:text-emerald-600 transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-600/25 hover:bg-emerald-500 transition-all"
          >
            Sign up
          </Link>
        </div>
      </nav>
    </header>
  );
}
