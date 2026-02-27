import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/jwt";

function parseBody(body: unknown): { email?: string; password?: string } {
  if (body && typeof body === "object" && "email" in body && "password" in body) {
    return {
      email: typeof (body as Record<string, unknown>).email === "string" ? (body as Record<string, unknown>).email as string : undefined,
      password: typeof (body as Record<string, unknown>).password === "string" ? (body as Record<string, unknown>).password as string : undefined,
    };
  }
  return {};
}

// We validate credentials, then return a JWT and user info.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = parseBody(body);

    if (!email?.trim()) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 }
      );
    }
    if (!password) {
      return NextResponse.json(
        { error: "Password is required." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const token = signToken(user.id, user.role);

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json(
      { error: "Login failed. Please try again." },
      { status: 500 }
    );
  }
}
