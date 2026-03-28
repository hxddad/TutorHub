// lib/validators/courseValidator.ts
// NFR4 - validates course creation and update inputs

export interface CourseInput {
  title?: unknown;
  subject?: unknown;
  description?: unknown;
  price?: unknown;
  level?: unknown;
  isPublished?: unknown;
}

// NFR4 - title, subject are required; price must be non-negative if supplied
export function validateCourseInput(body: CourseInput): string | null {
  const title = (body.title ?? "").toString().trim();
  const subject = (body.subject ?? "").toString().trim();
  if (!title) return "title is required";
  if (title.length > 200) return "title must be 200 characters or fewer";
  if (!subject) return "subject is required";
  if (subject.length > 100) return "subject must be 100 characters or fewer";
  if (body.price !== undefined && body.price !== null) {
    const price = Number(body.price);
    if (isNaN(price) || price < 0) return "price must be a non-negative number";
  }
  return null;
}
