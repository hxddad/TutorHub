import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-secret-change-me"
);

function getToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  const cookie = request.cookies.get("authToken")?.value;
  if (cookie) {
    try {
      return decodeURIComponent(cookie);
    } catch {
      return cookie;
    }
  }
  return null;
}

// We only protect dashboard routes; other routes pass through.
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/dashboard")) {
    return NextResponse.next();
  }

  const token = getToken(request);
  if (!token) {
    const login = new URL("/login", request.url);
    return NextResponse.redirect(login);
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const sub = payload.sub as string;
    const role = payload.role as string;
    // We attach user id and role to headers for dashboard pages.
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", sub);
    requestHeaders.set("x-user-role", role);
    return NextResponse.next({ request: { headers: requestHeaders } });
  } catch {
    const login = new URL("/login", request.url);
    return NextResponse.redirect(login);
  }
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
