// lib/validators.ts
// Backward-compatible re-export barrel
// All validators have been split into domain files under lib/validators/
// This file ensures existing imports like:
//   import { validateCourseInput } from "@/lib/validators"
// continue to work without any changes

export * from "./validators/courseValidator";
export * from "./validators/planningValidator";
export * from "./validators/messagingValidator";
export * from "./validators/assessmentValidator";
