/**
 * Session cookie helpers for Node server code (RSC layouts/pages and route
 * handlers). The session is a stateless signed token stored only in the
 * `gente_session` cookie (see session-token.ts). The middleware reads the
 * cookie name from session-cookie.ts.
 */
import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE, SESSION_TTL_SECONDS } from "../session-cookie";

export async function getSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

/** Secure cookies only over HTTPS (respects proxy headers for local prod tests). */
export function isSecureRequest(request: Request): boolean {
  const forwarded = request.headers.get("x-forwarded-proto");
  if (forwarded) return forwarded.includes("https");
  return new URL(request.url).protocol === "https:";
}

/** Cookie attributes for the session cookie. */
export function sessionCookieOptions(
  request: Request,
  maxAge: number = SESSION_TTL_SECONDS,
) {
  return {
    httpOnly: true,
    secure: isSecureRequest(request),
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}
