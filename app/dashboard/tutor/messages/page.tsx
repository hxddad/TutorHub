import MessagesClient from "@/components/MessagesClient";

export default function TutorMessagesPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-emerald-700/80">
          Communication
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Messages</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
          Message students and other users on the platform.
        </p>
      </header>
      <MessagesClient />
    </div>
  );
}
