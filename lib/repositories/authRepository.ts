// lib/repositories/authRepository.ts
// All Prisma calls for authentication — authService never imports prisma directly
// NFR15 (maintainability), NFR13 (testability)

import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

// FR1/FR2 - look up a user by email (used for duplicate check on register and credential check on login)
export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

// FR1 - persist a new user record after validation and password hashing
export async function createUser(data: {
  fullName: string;
  email: string;
  password: string;
  role: Role;
}) {
  return prisma.user.create({ data });
}
