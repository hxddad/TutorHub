// app/api/auth/login/route.ts
// FR2 (login), NFR1 (JWT), NFR15 (thin route — all logic in authService)
// Route parses the request and delegates entirely to authService.loginUser

import { NextRequest, NextResponse } from "next/server";
import * as authService from "@/lib/services/authService";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const result = await authService.loginUser(body);
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    if (err?.status) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("Login error:", err);
    return NextResponse.json({ error: "Login failed. Please try again." }, { status: 500 });
  }
}
