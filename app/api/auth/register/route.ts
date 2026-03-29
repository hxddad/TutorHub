// app/api/auth/register/route.ts
// FR1 (register), NFR4 (validation), NFR15 (thin route — all logic in authService)
// Route parses the request and delegates entirely to authService.registerUser

import { NextRequest, NextResponse } from "next/server";
import * as authService from "@/lib/services/authService";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const user = await authService.registerUser(body);
    return NextResponse.json({ success: true, user });
  } catch (err: any) {
    if (err?.status) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("Register error:", err);
    return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 });
  }
}
