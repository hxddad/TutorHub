// @vitest-environment jsdom
// components/RegisterForm.test.tsx
// Unit tests for the RegisterForm React component
// Layer: Frontend UI — verifies field validation, form submission, success/error states

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import RegisterForm from "./RegisterForm";

// Mock Next.js link as a plain anchor
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

describe("RegisterForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // Smoke test: all form fields are rendered on initial mount
  it("renders all required form fields", () => {
    render(<RegisterForm />);
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument();
  });

  // NFR4: submit button is disabled when the form is untouched (all fields empty)
  it("disables submit button when form is blank (NFR4)", () => {
    render(<RegisterForm />);
    expect(screen.getByRole("button", { name: /create account/i })).toBeDisabled();
  });

  // NFR4: name must be at least 2 characters — "A" alone is insufficient
  it("shows name error when name is only 1 character (NFR4)", () => {
    render(<RegisterForm />);
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "A" } });
    expect(screen.getByText(/at least 2 characters/i)).toBeInTheDocument();
  });

  // NFR4: empty name is caught before any API call
  it("shows name error when full name is empty (NFR4)", () => {
    render(<RegisterForm />);
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "" } });
    // error is computed live from the current value
    expect(screen.getByText(/full name is required/i)).toBeInTheDocument();
  });

  // NFR4: email must match the RFC-like email pattern
  it("shows email format error for an invalid email (NFR4)", () => {
    render(<RegisterForm />);
    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: "notanemail" } });
    expect(screen.getByText(/valid email/i)).toBeInTheDocument();
  });

  // NFR4: password must be at least 8 characters per the security policy
  it("shows password length error when password is under 8 characters (NFR4)", () => {
    render(<RegisterForm />);
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "short" } });
    expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
  });

  // NFR4: the confirm password field must match the password field exactly
  it("shows mismatch error when confirm password does not match (NFR4)", () => {
    render(<RegisterForm />);
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "securePass1" } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: "differentPass" },
    });
    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
  });

  // NFR4: a role must be selected before submitting — prevents ambiguous account creation
  it("shows role error when no role is selected (NFR4)", () => {
    render(<RegisterForm />);
    // Role is "" by default; error should be visible without touching the field
    expect(screen.getByText(/please select a role/i)).toBeInTheDocument();
  });

  // NFR4: terms must be agreed to before the account can be created
  it("shows terms error when terms are not agreed (NFR4)", () => {
    render(<RegisterForm />);
    expect(screen.getByText(/must agree/i)).toBeInTheDocument();
  });

  // FR1 happy path: filling all fields correctly enables the submit button
  it("enables submit button when all fields are valid (FR1)", () => {
    render(<RegisterForm />);
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "Alice Student" } });
    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: "alice@test.com" } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "securePass1" } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "securePass1" } });
    fireEvent.click(screen.getByDisplayValue("student")); // role radio
    fireEvent.click(screen.getByRole("checkbox")); // terms
    expect(screen.getByRole("button", { name: /create account/i })).not.toBeDisabled();
  });

  // FR1: form sends role as uppercase to match the server's expected enum value
  it("calls POST /api/auth/register with role uppercased (FR1)", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: { id: "u1", role: "STUDENT" } }),
    } as any);

    render(<RegisterForm />);
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "Alice Student" } });
    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: "alice@test.com" } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "securePass1" } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "securePass1" } });
    fireEvent.click(screen.getByDisplayValue("student"));
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      const body = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as any).body);
      expect(body.role).toBe("STUDENT"); // sent as uppercase
    });
  });

  // FR1: successful registration shows a success message and clears the form
  it("shows success message and clears form after registration (FR1)", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: { id: "u1" } }),
    } as any);

    render(<RegisterForm />);
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "Alice" } });
    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: "alice@test.com" } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "securePass1" } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "securePass1" } });
    fireEvent.click(screen.getByDisplayValue("student"));
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/account created/i);
    });
    // Form should reset — name input is blank again
    expect((screen.getByLabelText(/full name/i) as HTMLInputElement).value).toBe("");
  });

  // FR1: a 409 duplicate email response is surfaced as a user-readable error
  it("shows server error message when registration fails (FR1)", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "An account with this email already exists." }),
    } as any);

    render(<RegisterForm />);
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "Alice" } });
    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: "alice@test.com" } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "securePass1" } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "securePass1" } });
    fireEvent.click(screen.getByDisplayValue("student"));
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/already exists/i);
    });
  });

  // Network failure: a crash in fetch produces a readable fallback error
  it("shows fallback error when fetch throws", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("Network"));

    render(<RegisterForm />);
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "Alice" } });
    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: "alice@test.com" } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "securePass1" } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "securePass1" } });
    fireEvent.click(screen.getByDisplayValue("student"));
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/registration failed/i);
    });
  });

  // UX: button shows loading text while the request is in flight
  it('shows "Creating account…" while submitting', async () => {
    vi.mocked(fetch).mockImplementationOnce(() => new Promise(() => {}));

    render(<RegisterForm />);
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "Alice" } });
    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: "alice@test.com" } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "securePass1" } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "securePass1" } });
    fireEvent.click(screen.getByDisplayValue("student"));
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByRole("button")).toHaveTextContent(/creating account/i);
    });
  });
});
