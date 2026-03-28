// @vitest-environment jsdom
// components/CourseList.test.tsx
// Unit tests for the CourseList React component
// Layer: Frontend UI — verifies fetch calls, loading state, course rendering, and subject filter

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import CourseList from "./CourseList";

const mockCourses = [
  {
    id: 1,
    title: "Maths 101",
    subject: "Maths",
    description: "Introduction to maths",
    price: 29.99,
    level: "Beginner",
    tutor: { id: "t1", fullName: "Bob Tutor" },
  },
  {
    id: 2,
    title: "Physics 201",
    subject: "Physics",
    description: null,
    price: null,
    level: null,
    tutor: { id: "t2", fullName: "Carol Tutor" },
  },
];

describe("CourseList", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  // UX: "Loading..." appears while the initial course fetch is in flight
  it('shows loading state while fetching courses', async () => {
    vi.mocked(fetch).mockImplementationOnce(() => new Promise(() => {}));
    render(<CourseList />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  // FR4: courses returned by the API are rendered as list items
  it("renders a list of courses from the API (FR4)", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockCourses,
    } as any);

    render(<CourseList />);

    await waitFor(() => {
      expect(screen.getByText("Maths 101")).toBeInTheDocument();
      expect(screen.getByText("Physics 201")).toBeInTheDocument();
    });
  });

  // FR4: each course card shows the tutor name
  it("displays the tutor's name for each course (FR4)", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockCourses,
    } as any);

    render(<CourseList />);

    await waitFor(() => {
      expect(screen.getByText("Bob Tutor")).toBeInTheDocument();
      expect(screen.getByText("Carol Tutor")).toBeInTheDocument();
    });
  });

  // FR4: price is displayed when available; absent when null
  it("shows price for courses that have one set", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockCourses,
    } as any);

    render(<CourseList />);

    await waitFor(() => {
      expect(screen.getByText("$29.99")).toBeInTheDocument();
    });
  });

  // FR4: each course has a "View" link pointing to /courses/{id}
  it("renders a View link for each course (FR4)", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockCourses,
    } as any);

    render(<CourseList />);

    await waitFor(() => {
      const viewLinks = screen.getAllByRole("link", { name: /view/i });
      expect(viewLinks).toHaveLength(2);
      expect(viewLinks[0]).toHaveAttribute("href", "/courses/1");
    });
  });

  // FR4 empty state: when the API returns no courses, an informative message is shown
  it('shows "No courses found." when the API returns an empty array (FR4)', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => [],
    } as any);

    render(<CourseList />);

    await waitFor(() => {
      expect(screen.getByText(/no courses found/i)).toBeInTheDocument();
    });
  });

  // FR4 subject filter: the dropdown is populated with unique subjects from the course list
  it("populates the subject dropdown with unique subjects from the results", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockCourses,
    } as any);

    render(<CourseList />);

    await waitFor(() => {
      const dropdown = screen.getByRole("combobox");
      expect(dropdown).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "Maths" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "Physics" })).toBeInTheDocument();
    });
  });

  // FR4 subject filter: selecting a subject triggers a new fetch with the subject query param
  // Note: the component fires two fetches on mount (both useEffect hooks run with subject="")
  // so we need 3 mocked responses: initial-load #1, initial-load #2, then the filtered fetch
  it("fetches with subject query param when a subject is selected from the dropdown (FR4)", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourses } as any)
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourses } as any) // 2nd mount fetch
      .mockResolvedValueOnce({ ok: true, json: async () => [mockCourses[0]] } as any); // subject filter

    render(<CourseList />);

    // Wait for initial load
    await waitFor(() => screen.getByText("Maths 101"));

    // Change filter to Maths
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Maths" } });

    await waitFor(() => {
      // The filtered fetch call should include the subject query param
      const calls = vi.mocked(fetch).mock.calls;
      const filteredCall = calls.find(([url]) => String(url).includes("subject=Maths"));
      expect(filteredCall).toBeDefined();
    });
  });

  // FR4: "No description" fallback shown for courses without a description
  it('shows "No description" for courses with null description', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => [mockCourses[1]], // Physics, description: null
    } as any);

    render(<CourseList />);

    await waitFor(() => {
      expect(screen.getByText(/no description/i)).toBeInTheDocument();
    });
  });
});
