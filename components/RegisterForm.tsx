"use client";

import { useState, useCallback } from "react";
import Link from "next/link";

type Role = "student" | "tutor" | "";

export interface RegisterFormData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: Role;
  agreeToTerms: boolean;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateName(value: string): string {
  if (!value.trim()) return "Full name is required.";
  if (value.trim().length < 2) return "Name must be at least 2 characters.";
  return "";
}

function validateEmail(value: string): string {
  if (!value.trim()) return "Email is required.";
  if (!EMAIL_REGEX.test(value.trim())) return "Please enter a valid email address.";
  return "";
}

function validatePassword(value: string): string {
  if (!value) return "Password is required.";
  if (value.length < 8) return "Password must be at least 8 characters.";
  return "";
}

function validateConfirmPassword(value: string, password: string): string {
  if (!value) return "Please confirm your password.";
  if (value !== password) return "Passwords do not match.";
  return "";
}

export default function RegisterForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<Role>("");
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nameError = validateName(fullName);
  const emailError = validateEmail(email);
  const passwordError = validatePassword(password);
  const confirmError = validateConfirmPassword(confirmPassword, password);
  const roleError = !role ? "Please select a role." : "";
  const termsError = !agreeToTerms ? "You must agree to the Terms and Privacy Policy." : "";

  const isInvalid =
    !!nameError ||
    !!emailError ||
    !!passwordError ||
    !!confirmError ||
    !!roleError ||
    !!termsError;

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (isInvalid) return;
      setErrorMessage(null);
      setIsSubmitting(true);
      try {
        // We send the form data to the register API.
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: fullName.trim(),
            email: email.trim(),
            password,
            role: role.toUpperCase(),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setErrorMessage(data.error || "Registration failed. Please try again.");
          return;
        }
        setSuccessMessage("Account created successfully!");
        setFullName("");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setRole("");
        setAgreeToTerms(false);
        setTimeout(() => setSuccessMessage(null), 5000);
      } catch {
        setErrorMessage("Registration failed. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      fullName,
      email,
      password,
      confirmPassword,
      role,
      agreeToTerms,
      isInvalid,
    ]
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
        <label htmlFor="fullName" className="block text-sm font-medium text-slate-700 mb-1.5">
          Full Name
        </label>
        <input
          id="fullName"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="e.g. Alex Johnson"
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition shadow-sm"
          autoComplete="name"
        />
        {nameError && <p className="mt-1.5 text-sm text-red-600">{nameError}</p>}
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition shadow-sm"
          autoComplete="email"
        />
        {emailError && <p className="mt-1.5 text-sm text-red-600">{emailError}</p>}
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Min. 8 characters"
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition shadow-sm"
          autoComplete="new-password"
        />
        {passwordError && <p className="mt-1.5 text-sm text-red-600">{passwordError}</p>}
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-1.5">
          Confirm Password
        </label>
        <input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Repeat password"
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition shadow-sm"
          autoComplete="new-password"
        />
        {confirmError && <p className="mt-1.5 text-sm text-red-600">{confirmError}</p>}
      </div>

      <div>
        <span className="block text-sm font-medium text-slate-700 mb-2">Role</span>
        <div className="flex gap-6">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="role"
              value="student"
              checked={role === "student"}
              onChange={() => setRole("student")}
              className="w-4 h-4 text-emerald-600 border-slate-300 focus:ring-emerald-500"
            />
            <span className="text-slate-700">Student</span>
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="role"
              value="tutor"
              checked={role === "tutor"}
              onChange={() => setRole("tutor")}
              className="w-4 h-4 text-emerald-600 border-slate-300 focus:ring-emerald-500"
            />
            <span className="text-slate-700">Tutor</span>
          </label>
        </div>
        {roleError && <p className="mt-1.5 text-sm text-red-600">{roleError}</p>}
      </div>

      <div>
        <label className="inline-flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={agreeToTerms}
            onChange={(e) => setAgreeToTerms(e.target.checked)}
            className="mt-1 w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          <span className="text-sm text-slate-600">
            I agree to the{" "}
            <a href="#" className="font-medium text-emerald-600 hover:text-emerald-700 hover:underline">Terms</a>
            {" "}and{" "}
            <a href="#" className="font-medium text-emerald-600 hover:text-emerald-700 hover:underline">Privacy Policy</a>
          </span>
        </label>
        {termsError && <p className="mt-1.5 text-sm text-red-600">{termsError}</p>}
      </div>

      <button
        type="submit"
        disabled={isInvalid || isSubmitting}
        className="w-full rounded-xl bg-emerald-600 px-4 py-3.5 text-sm font-semibold text-white shadow-md shadow-emerald-600/25 hover:bg-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {isSubmitting ? "Creating account…" : "Create account"}
      </button>

      <p className="text-center text-sm text-slate-600">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-emerald-600 hover:text-emerald-700 hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
