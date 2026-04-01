// @vitest-environment jsdom
// components/TutorCourseList.test.tsx
// Unit tests for the TutorCourseList React component
// FR5 — tutor course management; NFR13 (testability)

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import TutorCourseList from "./TutorCourseList";

const mockCourses = [
  {
    id: 1,
    title: "Maths 101",
    subject: "Mathematics",
    isPublished: true,
    _count: { enrollments: 5, assignments: 3 },
  },
  {
    id: 2,
    title: "Physics 201",
    subject: "Physics",
    isPublished: false,
    _count: { enrollments: 0, assignments: 1 },
  },
];

describe("TutorCourseList", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    vi.stubGlobal("confirm", vi.fn(() => true));
    vi.stubGlobal("alert", vi.fn());
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  // ── Loading state ─────────────────────────────────────────────────────────
  it("shows loading state while fetching courses (FR5)", () => {
    vi.mocked(fetch).mockImplementationOnce(() => new Promise(() => {}));
    render(<TutorCourseList />);
    expect(screen.getByText(/loading courses/i)).toBeInTheDocument();
  });

  // ── Renders courses (FR5) ─────────────────────────────────────────────────
  it("renders all courses returned by the API (FR5)", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => mockCourses } as any);
    render(<TutorCourseList />);
    await waitFor(() => {
      expect(screen.getByText("Maths 101")).toBeInTheDocument();
      expect(screen.getByText("Physics 201")).toBeInTheDocument();
    });
  });

  it("shows enrollment and assignment counts per course card (FR5)", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => [mockCourses[0]] } as any);
    render(<TutorCourseList />);
    await waitFor(() => {
      expect(screen.getByText(/5 enrolled/i)).toBeInTheDocument();
      expect(screen.getByText(/3 assignment/i)).toBeInTheDocument();
    });
  });

  it('shows "1 assignment" (singular) when there is exactly 1 (FR5)', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => [{ ...mockCourses[1], _count: { enrollments: 0, assignments: 1 } }],
    } as any);
    render(<TutorCourseList />);
    await waitFor(() => {
      expect(screen.getByText(/1 assignment$/i)).toBeInTheDocument();
    });
  });

  // ── Published / Draft badges (FR5) ────────────────────────────────────────
  it('renders "Published" badge for published and "Draft" for archived courses (FR5)', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => mockCourses } as any);
    render(<TutorCourseList />);
    await waitFor(() => {
      expect(screen.getByText("Published")).toBeInTheDocument();
      expect(screen.getByText("Draft")).toBeInTheDocument();
    });
  });

  // ── Edit link (FR5) ───────────────────────────────────────────────────────
  it("renders an Edit link for each course pointing to the correct edit URL (FR5)", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => [mockCourses[0]] } as any);
    render(<TutorCourseList />);
    await waitFor(() => {
      const editLink = screen.getByRole("link", { name: /edit/i });
      expect(editLink).toHaveAttribute("href", "/dashboard/tutor/courses/1/edit");
    });
  });

  // ── Archive button visibility (FR5) ──────────────────────────────────────
  it("shows Archive button only for published courses, not for drafts (FR5)", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => mockCourses } as any);
    render(<TutorCourseList />);
    await waitFor(() => {
      // mockCourses has one published (id=1) and one draft (id=2)
      expect(screen.getAllByRole("button", { name: /archive/i })).toHaveLength(1);
    });
  });

  // ── Empty state (FR5) ─────────────────────────────────────────────────────
  it("shows empty state message when the tutor has no courses yet (FR5)", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => [] } as any);
    render(<TutorCourseList />);
    await waitFor(() => {
      expect(screen.getByText(/no courses yet/i)).toBeInTheDocument();
    });
  });

  // ── Error states ──────────────────────────────────────────────────────────
  it("shows API error message when the mine endpoint returns an error (FR5)", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Unauthorized" }),
    } as any);
    render(<TutorCourseList />);
    await waitFor(() => {
      expect(screen.getByText("Unauthorized")).toBeInTheDocument();
    });
  });

  it("shows fallback error message when fetch throws a network error (FR5)", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"));
    render(<TutorCourseList />);
    await waitFor(() => {
      expect(screen.getByText(/failed to load courses/i)).toBeInTheDocument();
    });
  });

  // ── Archive action (FR5) ──────────────────────────────────────────────────
  it("calls DELETE /api/courses?id=X when Archive is confirmed (FR5)", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: true, json: async () => [mockCourses[0]] } as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) } as any);

    render(<TutorCourseList />);
    await waitFor(() => screen.getByRole("button", { name: /archive/i }));
    fireEvent.click(screen.getByRole("button", { name: /archive/i }));

    await waitFor(() => {
      const calls = vi.mocked(fetch).mock.calls;
      const deleteCall = calls.find(([, opts]: any) => opts?.method === "DELETE");
      expect(deleteCall).toBeDefined();
      expect(String(deleteCall![0])).toContain("id=1");
    });
  });

  it("prompts for confirmation before archiving a course (UX)", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: true, json: async () => [mockCourses[0]] } as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) } as any);

    render(<TutorCourseList />);
    await waitFor(() => screen.getByRole("button", { name: /archive/i }));
    fireEvent.click(screen.getByRole("button", { name: /archive/i }));

    expect(window.confirm).toHaveBeenCalled();
  });

  it("does not call DELETE when the user cancels the confirm dialog (UX)", async () => {
    vi.stubGlobal("confirm", vi.fn(() => false));
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => [mockCourses[0]] } as any);

    render(<TutorCourseList />);
    await waitFor(() => screen.getByRole("button", { name: /archive/i }));
    fireEvent.click(screen.getByRole("button", { name: /archive/i }));

    // Only the initial load fetch; no DELETE
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });

  it('optimistically marks course as "Draft" after successful archive (FR5)', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: true, json: async () => [mockCourses[0]] } as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) } as any);

    render(<TutorCourseList />);
    await waitFor(() => screen.getByText("Published"));
    fireEvent.click(screen.getByRole("button", { name: /archive/i }));

    await waitFor(() => {
      expect(screen.getByText("Draft")).toBeInTheDocument();
    });
  });

  it('shows "Archiving..." on the button while the DELETE is in flight (UX)', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: true, json: async () => [mockCourses[0]] } as any)
      .mockImplementationOnce(() => new Promise(() => {})); // archive hangs

    render(<TutorCourseList />);
    await waitFor(() => screen.getByRole("button", { name: /archive/i }));
    fireEvent.click(screen.getByRole("button", { name: /archive/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /archiving/i })).toBeInTheDocument();
    });
  });
});
