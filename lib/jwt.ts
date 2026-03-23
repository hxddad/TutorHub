import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-change-me";

export interface JwtPayload {
  sub: string;
  role: Role;
  iat?: number;
  exp?: number;
}

// We sign a JWT with user id and role for auth.
export function signToken(userId: string, role: Role): string {
  return jwt.sign(
    { sub: userId, role },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    return decoded;
  } catch {
    return null;
  }
}
