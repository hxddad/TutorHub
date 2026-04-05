export const ROLES = ["STUDENT", "TUTOR", "ADMIN"] as const;

export type Role = (typeof ROLES)[number];

export const RoleValues = {
  STUDENT: "STUDENT",
  TUTOR: "TUTOR",
  ADMIN: "ADMIN",
} as const satisfies Record<Role, Role>;
