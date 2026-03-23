"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Thread = {
  peer: { id: string; fullName: string; email: string };
  lastAt: string;
  preview: string;
  unread: number;
};

type Msg = {
  id: string;
  content: string;
  createdAt: string;
  senderId: string;
  receiverId: string;
  isRead: boolean;
};

type UserHit = { id: string; fullName: string; email: string; role: string };

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatThreadTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (sameDay) return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear()
  )
    return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatMsgTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function bearerFromStorage(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const t = localStorage.getItem("token");
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...bearerFromStorage(),
      ...(init?.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const d = data as { error?: string; detail?: string };
    const msg =
      d.detail ||
      d.error ||
      (typeof data === "object" && data && "message" in data
        ? String((data as { message: string }).message)
        : null) ||
      res.statusText;
    throw new Error(msg);
  }
  return data as T;
}

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const sz =
    size === "sm"
      ? "h-9 w-9 text-[10px]"
      : "h-10 w-10 text-xs";
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-700 to-teal-800 font-bold tracking-wide text-white shadow-sm ring-2 ring-white ${sz}`}
      aria-hidden
    >
      {initials(name)}
    </div>
  );
}

export default function MessagesClient() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedPeerId, setSelectedPeerId] = useState<string | null>(null);
  const [peerHeader, setPeerHeader] = useState<{ fullName: string; email: string } | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [searchHits, setSearchHits] = useState<UserHit[]>([]);
  const [searching, setSearching] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadThreads = useCallback(async () => {
    setLoadingThreads(true);
    setError(null);
    try {
      const data = await api<{ threads: Thread[] }>("/api/messages");
      setThreads(data.threads);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load threads");
    } finally {
      setLoadingThreads(false);
    }
  }, []);

  const loadConversation = useCallback(
    async (peerId: string) => {
      setLoadingChat(true);
      setError(null);
      try {
        const data = await api<{
          peer: { id: string; fullName: string; email: string };
          messages: Msg[];
        }>(`/api/messages?with=${encodeURIComponent(peerId)}`);
        setPeerHeader({ fullName: data.peer.fullName, email: data.peer.email });
        setMessages(data.messages);
        loadThreads();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load conversation");
      } finally {
        setLoadingChat(false);
      }
    },
    [loadThreads]
  );

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    if (selectedPeerId) {
      loadConversation(selectedPeerId);
    } else {
      setMessages([]);
      setPeerHeader(null);
    }
  }, [selectedPeerId, loadConversation]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!showNew) return;
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const q = searchQ.trim();
        const data = await api<{ users: UserHit[] }>(
          `/api/messages/users?q=${encodeURIComponent(q)}`
        );
        setSearchHits(data.users);
      } catch {
        setSearchHits([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [searchQ, showNew]);

  async function submitMessage() {
    if (!selectedPeerId || !draft.trim()) return;
    setError(null);
    try {
      await api("/api/messages", {
        method: "POST",
        body: JSON.stringify({ receiverId: selectedPeerId, content: draft.trim() }),
      });
      setDraft("");
      await loadConversation(selectedPeerId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Send failed");
    }
  }

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    void submitMessage();
  }

  function pickPeer(peerId: string, name: string, email: string) {
    setSelectedPeerId(peerId);
    setPeerHeader({ fullName: name, email });
    setShowNew(false);
    setSearchQ("");
  }

  return (
    <div className="mx-auto max-w-6xl overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_20px_50px_-12px_rgba(15,23,42,0.12)] ring-1 ring-slate-900/5">
      <div className="flex min-h-[520px] flex-col lg:h-[min(720px,calc(100vh-11rem))] lg:flex-row">
        {/* Thread list */}
        <aside className="flex w-full flex-shrink-0 flex-col border-b border-slate-200/80 bg-slate-50/40 lg:w-[min(100%,340px)] lg:border-b-0 lg:border-r lg:border-slate-200/80">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200/60 bg-white/80 px-4 py-3.5 backdrop-blur-sm">
            <div>
              <h2 className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Inbox
              </h2>
              <p className="text-sm font-semibold text-slate-900">Conversations</p>
            </div>
            <button
              type="button"
              onClick={() => setShowNew(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-500"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              New
            </button>
          </div>
          <div className="min-h-[200px] flex-1 overflow-y-auto overscroll-contain">
            {loadingThreads ? (
              <div className="space-y-3 p-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3 animate-pulse">
                    <div className="h-10 w-10 rounded-full bg-slate-200" />
                    <div className="flex-1 space-y-2 pt-1">
                      <div className="h-3 w-24 rounded bg-slate-200" />
                      <div className="h-2 w-full rounded bg-slate-100" />
                    </div>
                  </div>
                ))}
              </div>
            ) : threads.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-slate-700">No conversations yet</p>
                <p className="mt-1 max-w-[220px] text-xs leading-relaxed text-slate-500">
                  Start by selecting <span className="font-semibold text-emerald-700">New</span> and choosing someone to message.
                </p>
              </div>
            ) : (
              <ul className="py-1">
                {threads.map((t) => {
                  const active = selectedPeerId === t.peer.id;
                  return (
                    <li key={t.peer.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedPeerId(t.peer.id)}
                        className={`flex w-full gap-3 px-3 py-3 text-left transition ${
                          active
                            ? "bg-white shadow-[inset_3px_0_0_0_#059669]"
                            : "hover:bg-white/70"
                        }`}
                      >
                        <Avatar name={t.peer.fullName} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="truncate font-semibold text-slate-900">
                              {t.peer.fullName}
                            </span>
                            <time
                              className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-slate-400"
                              dateTime={t.lastAt}
                            >
                              {formatThreadTime(t.lastAt)}
                            </time>
                          </div>
                          <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{t.preview}</p>
                          {t.unread > 0 && (
                            <span className="mt-1.5 inline-flex items-center rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                              {t.unread} new
                            </span>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        {/* Main panel */}
        <section className="flex min-h-[380px] flex-1 flex-col bg-[linear-gradient(180deg,#fafafa_0%,#ffffff_40%)]">
          {showNew && (
            <div className="border-b border-slate-200/80 bg-white px-5 py-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Compose
                  </p>
                  <p className="text-sm font-semibold text-slate-900">New conversation</p>
                </div>
                <button
                  type="button"
                  className="rounded-lg px-2 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                  onClick={() => setShowNew(false)}
                >
                  Close
                </button>
              </div>
              <div className="relative mt-3">
                <svg
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input
                  type="search"
                  placeholder="Search by name or email…"
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/15"
                />
              </div>
              <ul className="mt-3 max-h-48 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50/80">
                {searching ? (
                  <li className="px-4 py-3 text-center text-xs text-slate-500">Searching…</li>
                ) : searchHits.length === 0 ? (
                  <li className="px-4 py-6 text-center text-xs text-slate-500">
                    {searchQ.trim() ? "No matches" : "Type to search users"}
                  </li>
                ) : (
                  searchHits.map((u) => (
                    <li key={u.id} className="border-b border-slate-100/80 last:border-0">
                      <button
                        type="button"
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-white"
                        onClick={() => pickPeer(u.id, u.fullName, u.email)}
                      >
                        <Avatar name={u.fullName} size="sm" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-medium text-slate-900">{u.fullName}</span>
                            <span className="shrink-0 rounded-md bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
                              {u.role}
                            </span>
                          </div>
                          <p className="truncate text-xs text-slate-500">{u.email}</p>
                        </div>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}

          {!selectedPeerId && !showNew ? (
            <div className="flex flex-1 flex-col items-center justify-center px-8 py-16 text-center">
              <div className="mb-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <svg className="h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l-1.27-3.11c.194-.29.515-.475.865-.501 1.152-.086 2.294-.213 3.423-.379 1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-slate-800">Select a conversation</h3>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
                Choose someone from the list or start a new thread to keep all tutoring communication in one place.
              </p>
            </div>
          ) : selectedPeerId ? (
            <>
              <header className="flex items-center gap-3 border-b border-slate-200/80 bg-white/95 px-4 py-3 backdrop-blur-md sm:px-5">
                <Avatar name={peerHeader?.fullName || "?"} />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-base font-semibold text-slate-900">
                    {peerHeader?.fullName || "…"}
                  </h3>
                  <p className="truncate text-xs text-slate-500">{peerHeader?.email}</p>
                </div>
              </header>

              <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
                {loadingChat ? (
                  <div className="flex justify-center py-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" aria-label="Loading" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <p className="text-sm font-medium text-slate-600">No messages yet</p>
                    <p className="mt-1 text-xs text-slate-400">Send a message below to start the conversation.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((m) => {
                      const sentByMe = m.senderId !== selectedPeerId;
                      return (
                        <div
                          key={m.id}
                          className={`flex ${sentByMe ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[min(100%,28rem)] rounded-2xl px-4 py-2.5 shadow-sm ${
                              sentByMe
                                ? "rounded-br-md bg-gradient-to-br from-emerald-600 to-teal-700 text-white"
                                : "rounded-bl-md border border-slate-200/90 bg-white text-slate-800"
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words text-[0.9375rem] leading-relaxed">
                              {m.content}
                            </p>
                            <time
                              className={`mt-1.5 block text-[10px] font-medium tabular-nums ${
                                sentByMe ? "text-emerald-100/90" : "text-slate-400"
                              }`}
                              dateTime={m.createdAt}
                              title={new Date(m.createdAt).toISOString()}
                            >
                              {formatMsgTime(m.createdAt)}
                            </time>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div ref={bottomRef} className="h-1" />
              </div>

              <form
                onSubmit={handleSend}
                className="border-t border-slate-200/80 bg-white p-3 sm:p-4"
              >
                <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50/50 p-1.5 pl-3 shadow-inner focus-within:border-emerald-500/40 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-500/10">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void submitMessage();
                      }
                    }}
                    placeholder="Write a message…"
                    rows={1}
                    className="max-h-32 min-h-[44px] w-full resize-none bg-transparent py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!draft.trim()}
                    className="mb-0.5 inline-flex shrink-0 items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-600/15 transition hover:bg-emerald-500 disabled:pointer-events-none disabled:opacity-40"
                  >
                    Send
                  </button>
                </div>
                <p className="mt-2 text-center text-[10px] text-slate-400">
                  <kbd className="rounded border border-slate-200 bg-slate-50 px-1 font-sans">Enter</kbd> to send ·{" "}
                  <kbd className="rounded border border-slate-200 bg-slate-50 px-1 font-sans">Shift+Enter</kbd> for new line
                </p>
              </form>
            </>
          ) : null}

          {error && (
            <div className="flex items-center justify-between gap-3 border-t border-red-200/80 bg-red-50 px-4 py-3 text-sm text-red-800">
              <span className="min-w-0">{error}</span>
              <button
                type="button"
                onClick={() => setError(null)}
                className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
              >
                Dismiss
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
