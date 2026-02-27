"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(value: string): string {
  if (!value.trim()) return "Email is required.";
  if (!EMAIL_REGEX.test(value.trim())) return "Please enter a valid email address.";
  return "";
}

function validatePassword(value: string): string {
  if (!value) return "Password is required.";
  return "";
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition shadow-sm";
const labelClass = "block text-sm font-medium text-slate-700 mb-1.5";
const errorClass = "mt-1.5 text-sm text-red-600";

// We store the token in a cookie so the dashboard middleware can read it.
function setAuthCookie(token: string) {
  const maxAge = 7 * 24 * 60 * 60; // 7 days
  document.cookie = `authToken=${encodeURIComponent(token)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const emailError = validateEmail(email);
  const passwordError = validatePassword(password);
  const isInvalid = !!emailError || !!passwordError;

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (isInvalid) return;
      setErrorMessage(null);
      setIsSubmitting(true);
      try {
        // We call the login API and then redirect by role.
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim(), password }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setErrorMessage(data.error || "Login failed. Please try again.");
          return;
        }
        const token = data.token;
        const role = data.user?.role;
        if (token) {
          if (typeof window !== "undefined") {
            window.localStorage.setItem("token", token);
            setAuthCookie(token);
          }
        }
        setSuccessMessage("Welcome back!");
        const dashboardPath =
          role === "ADMIN"
            ? "/dashboard/admin"
            : role === "TUTOR"
              ? "/dashboard/tutor"
              : "/dashboard/student";
        router.push(dashboardPath);
      } catch {
        setErrorMessage("Login failed. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [email, password, isInvalid, router]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {errorMessage && (
        <div
          role="alert"
          className="rounded-xl bg-red-50 border border-red-200 text-red-800 px-4 py-3 text-sm font-medium"
        >
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div
          role="alert"
          className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 text-sm font-medium"
        >
          {successMessage}
        </div>
      )}

      <div>
        <label htmlFor="login-email" className={labelClass}>
          Email
        </label>
        <input
          id="login-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className={inputClass}
          autoComplete="email"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor="login-password" className={labelClass}>
            Password
          </label>
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-slate-500 hover:text-emerald-600 transition-colors"
          >
            Forgot password?
          </Link>
        </div>
        <input
          id="login-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          className={inputClass}
          autoComplete="current-password"
        />
      </div>

      <button
        type="submit"
        disabled={isInvalid || isSubmitting}
        className="w-full rounded-xl bg-emerald-600 px-4 py-3.5 text-sm font-semibold text-white shadow-md shadow-emerald-600/25 hover:bg-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {isSubmitting ? "Signing in…" : "Log in"}
      </button>

      <p className="text-center text-sm text-slate-600">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-semibold text-emerald-600 hover:text-emerald-700 hover:underline">
          Sign up
        </Link>
      </p>
    </form>
  );
}
