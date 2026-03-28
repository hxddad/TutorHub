// @vitest-environment jsdom
// components/CreateCourseForm.test.tsx
// Unit tests for the CreateCourseForm React component
// Layer: Frontend UI — verifies NFR4 client-side validation and NFR2 identity rules

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import CreateCourseForm from "./CreateCourseForm";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe("CreateCourseForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // Smoke test: key form fields are visible on render
  it("renders title, subject, and submit button", () => {
    render(<CreateCourseForm />);
    expect(screen.getByText(/title/i)).toBeInTheDocument();
    expect(screen.getByText(/subject/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create course/i })).toBeInTheDocument();
  });

  // NFR4: submitting with no title or subject shows a validation error — no API call is made
  it("shows validation error and does not call API when title and subject are empty (NFR4)", async () => {
    render(<CreateCourseForm />);
    fireEvent.submit(screen.getByRole("button", { name: /create course/i }).closest("form")!);

    await waitFor(() => {
      expect(screen.getByText(/title and subject are required/i)).toBeInTheDocument();
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  // NFR4: only a blank title (with subject provided) also triggers the error
  it("shows error when title is empty but subject is filled (NFR4)", async () => {
    render(<CreateCourseForm />);
    const inputs = screen.getAllByRole("textbox");
    // subject input is the second textbox
    fireEvent.change(inputs[1], { target: { value: "Maths" } });
    fireEvent.submit(inputs[0].closest("form")!);

    await waitFor(() => {
      expect(screen.getByText(/title and subject are required/i)).toBeInTheDocument();
    });
  });

  // NFR2: the request body must NOT include tutorId — the server derives it from the JWT cookie
  // If tutorId were included, an attacker could attribute a course to any user
  it("does NOT include tutorId in the request body (NFR2)", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1, title: "Maths 101" }),
    } as any);

    render(<CreateCourseForm tutorId="should-be-ignored" />);
    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[0], { target: { value: "Maths 101" } });
    fireEvent.change(inputs[1], { target: { value: "Maths" } });
    fireEvent.submit(inputs[0].closest("form")!);

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    const sentBody = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as any).body);
    expect(sentBody).not.toHaveProperty("tutorId");
  });

  // FR5: on successful creation the form navigates to /courses
  it("navigates to /courses after successful course creation (FR5)", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1 }),
    } as any);

    render(<CreateCourseForm />);
    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[0], { target: { value: "Maths 101" } });
    fireEvent.change(inputs[1], { target: { value: "Maths" } });
    fireEvent.submit(inputs[0].closest("form")!);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/courses");
    });
  });

  // FR5: an API error is displayed as an inline message so the tutor can take action
  it("shows API error message when course creation fails (FR5)", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "subject is required" }),
    } as any);

    render(<CreateCourseForm />);
    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[0], { target: { value: "Maths 101" } });
    fireEvent.change(inputs[1], { target: { value: "Maths" } });
    fireEvent.submit(inputs[0].closest("form")!);

    await waitFor(() => {
      expect(screen.getByText(/subject is required/i)).toBeInTheDocument();
    });
  });

  // FR5: network failure shows a fallback error — form does not crash
  it("shows fallback error when fetch throws (FR5)", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("Network"));

    render(<CreateCourseForm />);
    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[0], { target: { value: "Maths 101" } });
    fireEvent.change(inputs[1], { target: { value: "Maths" } });
    fireEvent.submit(inputs[0].closest("form")!);

    await waitFor(() => {
      expect(screen.getByText(/failed to create course/i)).toBeInTheDocument();
    });
  });

  // UX: button shows "Saving…" while the request is in flight
  it('shows "Saving…" while the form is submitting', async () => {
    vi.mocked(fetch).mockImplementationOnce(() => new Promise(() => {}));

    render(<CreateCourseForm />);
    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[0], { target: { value: "Maths 101" } });
    fireEvent.change(inputs[1], { target: { value: "Maths" } });
    fireEvent.submit(inputs[0].closest("form")!);

    await waitFor(() => {
      expect(screen.getByRole("button")).toHaveTextContent(/saving/i);
    });
  });

  // FR5: the isPublished checkbox is checked by default so courses are visible immediately
  it("publishes course by default (isPublished checkbox is checked)", () => {
    render(<CreateCourseForm />);
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeChecked();
  });
});
