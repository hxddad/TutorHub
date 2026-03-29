// app/api/admin/stats/route.ts
// FR17 — admin platform overview stats; NFR1, NFR2

import { NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";
import * as adminService from "@/lib/services/adminService";

export async function GET(request: Request) {
  try {
    const auth = requireAuth(request);
    if (isAuthError(auth)) return auth;

    if (auth.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const stats = await adminService.getPlatformStats();
    return NextResponse.json(stats);
  } catch (err: any) {
    if (err?.status) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
