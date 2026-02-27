import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

const SALT_ROUNDS = 10;

function parseBody(body: unknown): { fullName?: string; email?: string; password?: string; role?: string } {
  if (body && typeof body === "object" && "fullName" in body && "email" in body && "password" in body && "role" in body) {
    return {
      fullName: typeof (body as Record<string, unknown>).fullName === "string" ? (body as Record<string, unknown>).fullName as string : undefined,
      email: typeof (body as Record<string, unknown>).email === "string" ? (body as Record<string, unknown>).email as string : undefined,
      password: typeof (body as Record<string, unknown>).password === "string" ? (body as Record<string, unknown>).password as string : undefined,
      role: typeof (body as Record<string, unknown>).role === "string" ? (body as Record<string, unknown>).role as string : undefined,
    };
  }
  return {};
}

const VALID_ROLES: Role[] = ["STUDENT", "TUTOR", "ADMIN"];

function toRole(value: string): Role | null {
  const u = value?.toUpperCase();
  return VALID_ROLES.includes(u as Role) ? (u as Role) : null;
}

// We validate input, hash the password, and create the user in the DB.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fullName, email, password, role } = parseBody(body);

    if (!fullName?.trim()) {
      return NextResponse.json(
        { error: "Full name is required." },
        { status: 400 }
      );
    }
    if (fullName.trim().length < 2) {
      return NextResponse.json(
        { error: "Name must be at least 2 characters." },
        { status: 400 }
      );
    }
    if (!email?.trim()) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 }
      );
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }
    if (!password) {
      return NextResponse.json(
        { error: "Password is required." },
        { status: 400 }
      );
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const parsedRole = toRole(role ?? "");
    if (!parsedRole) {
      return NextResponse.json(
        { error: "Please select a valid role (STUDENT, TUTOR, or ADMIN)." },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password: hashedPassword,
        role: parsedRole,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (err: unknown) {
    console.error("Register error:", err);
    const message =
      err && typeof err === "object" && "code" in err
        ? (err as { code: string }).code === "P1010"
          ? "Database access denied. Check .env: use postgresql://USER:PASSWORD@localhost:5432/tutorhub and ensure the database exists and the user has access."
          : (err as { code: string }).code === "ECONNREFUSED"
            ? "Cannot reach the database. Is PostgreSQL running? Check DATABASE_URL in .env."
            : undefined
        : undefined;
    return NextResponse.json(
      { error: message || "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}
