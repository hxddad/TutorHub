// lib/services/authService.ts
// Business logic for authentication — routes stay thin; all auth rules live here
// FR1 (register), FR2 (login), NFR1 (JWT), NFR4 (validation), NFR15 (SRP)

import bcrypt from "bcrypt";
import * as authRepo from "@/lib/repositories/authRepository";
import { signToken } from "@/lib/jwt";
import { ROLES, type Role } from "@/lib/roles";

const SALT_ROUNDS = 10;
const VALID_ROLES: readonly Role[] = ROLES;

function toRole(value: string): Role | null {
  const u = value?.toUpperCase();
  return VALID_ROLES.includes(u as Role) ? (u as Role) : null;
}

// FR1 + NFR4 - validate input, check for duplicate email, hash password, persist user
export async function registerUser(body: any) {
  const fullName = (body?.fullName ?? "").toString().trim();
  const email    = (body?.email    ?? "").toString().trim().toLowerCase();
  const password = (body?.password ?? "").toString();
  const roleRaw  = (body?.role     ?? "").toString();

  // NFR4 - input validation (mirrors the old inline checks, now owned by the service)
  if (!fullName)           throw { status: 400, message: "Full name is required." };
  if (fullName.length < 2) throw { status: 400, message: "Name must be at least 2 characters." };
  if (!email)              throw { status: 400, message: "Email is required." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
                           throw { status: 400, message: "Please enter a valid email address." };
  if (!password)           throw { status: 400, message: "Password is required." };
  if (password.length < 8) throw { status: 400, message: "Password must be at least 8 characters." };

  const role = toRole(roleRaw);
  if (!role) throw { status: 400, message: "Please select a valid role (STUDENT, TUTOR, or ADMIN)." };

  // FR1 - duplicate email check
  const existing = await authRepo.findUserByEmail(email);
  if (existing) throw { status: 409, message: "An account with this email already exists." };

  // NFR1 - hash before storing; plain-text passwords must never reach the DB
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await authRepo.createUser({ fullName, email, password: hashedPassword, role });

  // Return only safe fields — never expose the password hash
  return {
    id:        user.id,
    fullName:  user.fullName,
    email:     user.email,
    role:      user.role,
    createdAt: user.createdAt,
  };
}

// FR2 + NFR1 + NFR4 - validate credentials and return a signed JWT on success
export async function loginUser(body: any) {
  const email    = (body?.email    ?? "").toString().trim().toLowerCase();
  const password = (body?.password ?? "").toString();

  // NFR4 - basic presence validation
  if (!email)    throw { status: 400, message: "Email is required." };
  if (!password) throw { status: 400, message: "Password is required." };

  // FR2 - look up user; intentionally vague error to avoid user enumeration
  const user = await authRepo.findUserByEmail(email);
  if (!user) throw { status: 401, message: "Invalid email or password." };

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw { status: 401, message: "Invalid email or password." };

  // NFR1 - sign a JWT with the user's id and role
  const token = signToken(user.id, user.role);

  return {
    token,
    user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role },
  };
}
