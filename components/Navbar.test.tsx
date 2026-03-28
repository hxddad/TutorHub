// @vitest-environment jsdom
// components/Navbar.test.tsx
// Unit tests for the Navbar React component
// Layer: Frontend UI — verifies auth state rendering, logout behavior, and role-based dashboard link

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import React from "react";
import Navbar from "./Navbar";

// Mock next/image — we don't need to test actual image rendering
vi.mock("next/image", () => ({
  default: ({ alt, ...props }: any) => <img alt={alt} {...props} />,
}));

// Mock next/link as a plain anchor
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

describe("Navbar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Start each test with a clean localStorage and no auth cookie
    localStorage.clear();
    // Override document.cookie getter so we can control auth state
    Object.defineProperty(document, "cookie", {
      writable: true,
      value: "",
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  // Smoke test: when the user is not logged in, Log in and Sign up links are shown
  it("renders Log in and Sign up links when user is not authenticated", () => {
    render(<Navbar />);
    expect(screen.getByRole("link", { name: /log in/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /sign up/i })).toBeInTheDocument();
  });

  // UX: when not logged in, no Dashboard link or Log out button should appear
  it("does not show Dashboard or Log out when not authenticated", () => {
    render(<Navbar />);
    expect(screen.queryByRole("link", { name: /dashboard/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /log out/i })).not.toBeInTheDocument();
  });

  // FR3: when a student token is in localStorage, Dashboard link points to /dashboard/student
  it("shows Dashboard link pointing to /dashboard/student for STUDENT role (FR3)", async () => {
    // Create a minimal JWT payload for a STUDENT (base64url-encoded)
    const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" })).replace(/=/g, "");
    const payload = btoa(JSON.stringify({ sub: "s1", role: "STUDENT" }))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
    localStorage.setItem("token", `${header}.${payload}.sig`);

    render(<Navbar />);

    // Wait for useEffect to run
    await act(async () => {});

    const dashboardLink = screen.getByRole("link", { name: /dashboard/i });
    expect(dashboardLink).toHaveAttribute("href", "/dashboard/student");
  });

  // FR3: when a tutor token is in localStorage, Dashboard link points to /dashboard/tutor
  it("shows Dashboard link pointing to /dashboard/tutor for TUTOR role (FR3)", async () => {
    const header = btoa(JSON.stringify({ alg: "HS256" })).replace(/=/g, "");
    const payload = btoa(JSON.stringify({ sub: "t1", role: "TUTOR" }))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
    localStorage.setItem("token", `${header}.${payload}.sig`);

    render(<Navbar />);
    await act(async () => {});

    const dashboardLink = screen.getByRole("link", { name: /dashboard/i });
    expect(dashboardLink).toHaveAttribute("href", "/dashboard/tutor");
  });

  // FR3: ADMIN token routes Dashboard link to /dashboard/admin
  it("shows Dashboard link pointing to /dashboard/admin for ADMIN role (FR3)", async () => {
    const header = btoa(JSON.stringify({ alg: "HS256" })).replace(/=/g, "");
    const payload = btoa(JSON.stringify({ sub: "a1", role: "ADMIN" }))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
    localStorage.setItem("token", `${header}.${payload}.sig`);

    render(<Navbar />);
    await act(async () => {});

    const dashboardLink = screen.getByRole("link", { name: /dashboard/i });
    expect(dashboardLink).toHaveAttribute("href", "/dashboard/admin");
  });

  // FR3: when logged in, Log out button is shown instead of Log in / Sign up
  it("shows Log out button when user is authenticated (FR3)", async () => {
    const header = btoa(JSON.stringify({ alg: "HS256" })).replace(/=/g, "");
    const payload = btoa(JSON.stringify({ sub: "s1", role: "STUDENT" }))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
    localStorage.setItem("token", `${header}.${payload}.sig`);

    render(<Navbar />);
    await act(async () => {});

    expect(screen.getByRole("button", { name: /log out/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /log in/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /sign up/i })).not.toBeInTheDocument();
  });

  // FR16: clicking Log out removes the token from localStorage and dispatches auth-change
  it("removes token from localStorage on logout (FR16)", async () => {
    const header = btoa(JSON.stringify({ alg: "HS256" })).replace(/=/g, "");
    const payload = btoa(JSON.stringify({ sub: "s1", role: "STUDENT" }))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
    localStorage.setItem("token", `${header}.${payload}.sig`);

    // Spy on localStorage.removeItem
    const removeSpy = vi.spyOn(Storage.prototype, "removeItem");
    // Prevent the window.location.href redirect from throwing
    Object.defineProperty(window, "location", {
      writable: true,
      value: { href: "/" },
    });

    render(<Navbar />);
    await act(async () => {});

    const logoutBtn = screen.getByRole("button", { name: /log out/i });
    fireEvent.click(logoutBtn);

    expect(removeSpy).toHaveBeenCalledWith("token");
  });

  // UX: the TutorHub logo image is always rendered regardless of auth state
  it("always renders the TutorHub logo image", () => {
    render(<Navbar />);
    expect(screen.getByAltText(/tutorhub/i)).toBeInTheDocument();
  });

  // UX: the logo links to the home page "/"
  it("logo link points to /", () => {
    render(<Navbar />);
    // The first link in the nav is the logo link
    const links = screen.getAllByRole("link");
    expect(links[0]).toHaveAttribute("href", "/");
  });
});
