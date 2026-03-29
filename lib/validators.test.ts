// lib/validators.test.ts
// Unit tests for all shared validation functions (NFR4)
// These test each validator in complete isolation — no DB, no HTTP

import { describe, expect, it } from "vitest";
import { validateCourseInput } from "./validators/courseValidator";
import { validateStudyPlanInput, validateTaskToggle } from "./validators/planningValidator";
import { validateMessageInput } from "./validators/messagingValidator";
import { validateSubmissionInput, validateReviewInput } from "./validators/assessmentValidator";

// ── validateCourseInput ───────────────────────────────────────────────────────
describe("validateCourseInput", () => {
  it("returns null for valid input (NFR4 happy path)", () => {
    expect(validateCourseInput({ title: "Maths 101", subject: "Maths" })).toBeNull();
  });

  it("returns error when title is missing", () => {
    expect(validateCourseInput({ subject: "Maths" })).toBe("title is required");
  });

  it("returns error when title is whitespace only", () => {
    expect(validateCourseInput({ title: "   ", subject: "Maths" })).toBe("title is required");
  });

  it("returns error when title exceeds 200 characters", () => {
    expect(validateCourseInput({ title: "A".repeat(201), subject: "Maths" }))
      .toBe("title must be 200 characters or fewer");
  });

  it("returns error when subject is missing", () => {
    expect(validateCourseInput({ title: "Maths 101" })).toBe("subject is required");
  });

  it("returns error when subject exceeds 100 characters", () => {
    expect(validateCourseInput({ title: "Maths 101", subject: "S".repeat(101) }))
      .toBe("subject must be 100 characters or fewer");
  });

  it("returns error for negative price", () => {
    expect(validateCourseInput({ title: "T", subject: "S", price: -5 }))
      .toBe("price must be a non-negative number");
  });

  it("returns error for non-numeric price string", () => {
    expect(validateCourseInput({ title: "T", subject: "S", price: "free" }))
      .toBe("price must be a non-negative number");
  });

  it("accepts price of 0 (free course)", () => {
    expect(validateCourseInput({ title: "T", subject: "S", price: 0 })).toBeNull();
  });

  it("accepts null price (price not set)", () => {
    expect(validateCourseInput({ title: "T", subject: "S", price: null })).toBeNull();
  });
});

// ── validateStudyPlanInput ────────────────────────────────────────────────────
describe("validateStudyPlanInput", () => {
  const validTask = { title: "Read ch1", dueDate: "2026-06-01", courseId: 1 };

  it("returns null for a valid single task (NFR4 happy path)", () => {
    expect(validateStudyPlanInput({ tasks: [validTask] })).toBeNull();
  });

  it("returns null for multiple valid tasks", () => {
    expect(validateStudyPlanInput({ tasks: [validTask, { title: "Quiz", dueDate: "2026-06-10", courseId: 2 }] })).toBeNull();
  });

  it("returns error when tasks is missing", () => {
    expect(validateStudyPlanInput({})).toBe("tasks must be a non-empty array");
  });

  it("returns error when tasks is an empty array", () => {
    expect(validateStudyPlanInput({ tasks: [] })).toBe("tasks must be a non-empty array");
  });

  it("returns error when tasks is not an array", () => {
    expect(validateStudyPlanInput({ tasks: "read" })).toBe("tasks must be a non-empty array");
  });

  it("returns error when a task has no title", () => {
    expect(validateStudyPlanInput({ tasks: [{ dueDate: "2026-06-01", courseId: 1 }] }))
      .toBe("each task must have a non-empty title");
  });

  it("returns error when a task title is empty string", () => {
    expect(validateStudyPlanInput({ tasks: [{ title: "", dueDate: "2026-06-01", courseId: 1 }] }))
      .toBe("each task must have a non-empty title");
  });

  it("returns error when dueDate is invalid", () => {
    expect(validateStudyPlanInput({ tasks: [{ title: "T", dueDate: "not-a-date", courseId: 1 }] }))
      .toBe("each task must have a valid dueDate");
  });

  it("returns error when courseId is missing", () => {
    expect(validateStudyPlanInput({ tasks: [{ title: "T", dueDate: "2026-06-01" }] }))
      .toBe("each task must have a valid courseId");
  });

  it("returns error when courseId is not a number", () => {
    expect(validateStudyPlanInput({ tasks: [{ title: "T", dueDate: "2026-06-01", courseId: "abc" }] }))
      .toBe("each task must have a valid courseId");
  });
});

// ── validateTaskToggle ────────────────────────────────────────────────────────
describe("validateTaskToggle", () => {
  it("returns null when completed is true (NFR4 happy path)", () => {
    expect(validateTaskToggle({ completed: true })).toBeNull();
  });

  it("returns null when completed is false", () => {
    expect(validateTaskToggle({ completed: false })).toBeNull();
  });

  it("returns error when completed is a string", () => {
    expect(validateTaskToggle({ completed: "true" })).toBe("completed must be a boolean");
  });

  it("returns error when completed is a number", () => {
    expect(validateTaskToggle({ completed: 1 })).toBe("completed must be a boolean");
  });

  it("returns error when completed is missing", () => {
    expect(validateTaskToggle({})).toBe("completed must be a boolean");
  });
});

// ── validateMessageInput ──────────────────────────────────────────────────────
describe("validateMessageInput", () => {
  it("returns null for valid message (NFR4 happy path)", () => {
    expect(validateMessageInput({ receiverId: "user-123", content: "Hello!" })).toBeNull();
  });

  it("returns error when receiverId is missing", () => {
    expect(validateMessageInput({ content: "Hello!" })).toBe("receiverId is required");
  });

  it("returns error when receiverId is not a string", () => {
    expect(validateMessageInput({ receiverId: 42, content: "Hello!" })).toBe("receiverId is required");
  });

  it("returns error when content is empty", () => {
    expect(validateMessageInput({ receiverId: "user-123", content: "" })).toBe("content is required");
  });

  it("returns error when content is whitespace only", () => {
    expect(validateMessageInput({ receiverId: "user-123", content: "   " })).toBe("content is required");
  });

  it("returns error when content exceeds 8000 characters", () => {
    expect(validateMessageInput({ receiverId: "user-123", content: "x".repeat(8001) }))
      .toBe("content must be 8000 characters or fewer");
  });

  it("accepts content of exactly 8000 characters (boundary)", () => {
    expect(validateMessageInput({ receiverId: "user-123", content: "x".repeat(8000) })).toBeNull();
  });
});

// ── validateSubmissionInput ───────────────────────────────────────────────────
describe("validateSubmissionInput", () => {
  it("returns null for non-empty content (NFR4 happy path)", () => {
    expect(validateSubmissionInput({ content: "My answer" })).toBeNull();
  });

  it("returns error when content is empty string", () => {
    expect(validateSubmissionInput({ content: "" })).toBe("content is required");
  });

  it("returns error when content is whitespace only", () => {
    expect(validateSubmissionInput({ content: "   " })).toBe("content is required");
  });

  it("returns error when content is missing", () => {
    expect(validateSubmissionInput({})).toBe("content is required");
  });
});

// ── validateReviewInput ───────────────────────────────────────────────────────
describe("validateReviewInput", () => {
  it("returns null when no grade provided (feedback only review)", () => {
    expect(validateReviewInput({ feedback: "Good work" })).toBeNull();
  });

  it("returns null for a valid grade of 0", () => {
    expect(validateReviewInput({ grade: 0 })).toBeNull();
  });

  it("returns null for a valid grade of 100", () => {
    expect(validateReviewInput({ grade: 100 })).toBeNull();
  });

  it("returns null for null grade (explicitly not graded yet)", () => {
    expect(validateReviewInput({ grade: null })).toBeNull();
  });

  it("returns error when grade is negative", () => {
    expect(validateReviewInput({ grade: -1 }))
      .toBe("grade must be a number between 0 and 100");
  });

  it("returns error when grade exceeds 100", () => {
    expect(validateReviewInput({ grade: 101 }))
      .toBe("grade must be a number between 0 and 100");
  });

  it("returns error when grade is not a number", () => {
    expect(validateReviewInput({ grade: "A+" }))
      .toBe("grade must be a number between 0 and 100");
  });
});
