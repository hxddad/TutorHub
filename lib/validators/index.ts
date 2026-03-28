// lib/validators/index.ts
// Re-exports every validator so existing imports like:
//   import { validateCourseInput } from "@/lib/validators"
// continue to work after the split into domain files

export * from "./courseValidator";
export * from "./planningValidator";
export * from "./messagingValidator";
export * from "./assessmentValidator";
