// @vitest-environment jsdom
// components/LoginForm.test.tsx
// Unit tests for the LoginForm React component
// Layer: Frontend UI — verifies validation, fetch calls, success/error rendering, and routing

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import LoginForm from "./LoginForm";

// Mock next/navigation so useRouter doesn't need a real Next.js app
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock next/link as a plain anchor so RTL can render it
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

describe("LoginForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset fetch mock before each test
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // Smoke test: all expected form elements are present on initial render
  it("renders email input, password input, and a submit button", () => {
    render(<LoginForm />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    // The password label contains "Password" but is adjacent to a "Forgot password?" link;
    // we use the input type to identify the password field
    expect(screen.getByPlaceholderText(/enter your password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /log in/i })).toBeInTheDocument();
  });

  // NFR4 client-side validation: the submit button must be disabled when both fields are empty
  // so the user cannot trigger an API call with empty credentials
  it("disables submit button when email and password are empty (NFR4)", () => {
    render(<LoginForm />);
    expect(screen.getByRole("button", { name: /log in/i })).toBeDisabled();
  });

  // NFR4: button stays disabled even when only one of the two required fields is filled
  it("keeps button disabled when only email is filled", () => {
    render(<LoginForm />);
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "alice@test.com" },
    });
    expect(screen.getByRole("button", { name: /log in/i })).toBeDisabled();
  });

  // NFR4: button stays disabled when email is present but invalid
  it("keeps button disabled when email format is invalid (NFR4)", () => {
    render(<LoginForm />);
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "not-an-email" },
    });
    fireEvent.change(screen.getByPlaceholderText(/enter your password/i), {
      target: { value: "password123" },
    });
    expect(screen.getByRole("button", { name: /log in/i })).toBeDisabled();
  });

  // Button becomes enabled when both fields have valid content
  it("enables submit button when both fields are valid", () => {
    render(<LoginForm />);
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "alice@test.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/enter your password/i), {
      target: { value: "password123" },
    });
    expect(screen.getByRole("button", { name: /log in/i })).not.toBeDisabled();
  });

  // FR2: form submits to POST /api/auth/login with the trimmed email and password
  it("calls POST /api/auth/login with email and password on submit", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: "jwt123", user: { role: "STUDENT", email: "alice@test.com" } }),
    } as any);

    render(<LoginForm />);
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "alice@test.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/enter your password/i), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/auth/login", expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "alice@test.com", password: "password123" }),
      }));
    });
  });

  // FR3 routing: a STUDENT login must redirect to the student dashboard, not a generic path
  it("redirects to /dashboard/student after successful STUDENT login (FR3)", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: "jwt123", user: { role: "STUDENT" } }),
    } as any);

    render(<LoginForm />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "s@test.com" } });
    fireEvent.change(screen.getByPlaceholderText(/enter your password/i), {
      target: { value: "pass1234" },
    });
    fireEvent.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/dashboard/student");
    });
  });

  // FR3 routing: a TUTOR login must redirect to the tutor dashboard
  it("redirects to /dashboard/tutor after successful TUTOR login (FR3)", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: "jwt123", user: { role: "TUTOR" } }),
    } as any);

    render(<LoginForm />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "t@test.com" } });
    fireEvent.change(screen.getByPlaceholderText(/enter your password/i), {
      target: { value: "pass1234" },
    });
    fireEvent.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/dashboard/tutor");
    });
  });

  // FR3 routing: ADMIN login must redirect to the admin dashboard
  it("redirects to /dashboard/admin after successful ADMIN login (FR3)", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: "jwt123", user: { role: "ADMIN" } }),
    } as any);

    render(<LoginForm />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "admin@test.com" } });
    fireEvent.change(screen.getByPlaceholderText(/enter your password/i), {
      target: { value: "pass1234" },
    });
    fireEvent.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/dashboard/admin");
    });
  });

  // NFR1: a failed login (wrong credentials, 401 from server) must show an error message
  // so the user knows they need to try again
  it("shows API error message when login fails (NFR1)", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Invalid email or password." }),
    } as any);

    render(<LoginForm />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "a@test.com" } });
    fireEvent.change(screen.getByPlaceholderText(/enter your password/i), {
      target: { value: "wrongpass" },
    });
    fireEvent.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Invalid email or password.");
    });
  });

  // Network failure: fetch throws → a fallback error message is shown so the UI never crashes
  it("shows fallback error message when fetch throws a network error", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"));

    render(<LoginForm />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "a@test.com" } });
    fireEvent.change(screen.getByPlaceholderText(/enter your password/i), {
      target: { value: "pass1234" },
    });
    fireEvent.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/login failed/i);
    });
  });

  // UX: button shows "Signing in…" while the request is in flight to give feedback
  it('shows "Signing in…" while the form is submitting', async () => {
    // Never resolve — keeps the component in the submitting state
    vi.mocked(fetch).mockImplementationOnce(() => new Promise(() => {}));

    render(<LoginForm />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "a@test.com" } });
    fireEvent.change(screen.getByPlaceholderText(/enter your password/i), {
      target: { value: "pass1234" },
    });
    fireEvent.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => {
      expect(screen.getByRole("button")).toHaveTextContent(/signing in/i);
    });
  });
});
