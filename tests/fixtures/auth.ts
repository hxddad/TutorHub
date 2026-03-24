
import { Role } from "@prisma/client";

export const FIXTURE_USER_ID = "00000000-0000-4000-8000-000000000001";
export const FIXTURE_ROLE: Role = "STUDENT";

export function requestWithBearerToken(token: string) {
  return new Request("http://localhost/api/messages", {
    headers: { authorization: `Bearer ${token}` },
  });
}

export function requestWithAuthCookie(token: string) {
  return new Request("http://localhost/api/messages", {
    headers: { cookie: `authToken=${encodeURIComponent(token)}` },
  });
}
