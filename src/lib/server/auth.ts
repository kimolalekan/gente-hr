/**
 * Session-based auth for server code.
 *
 * The signed-in user is resolved from the `gente_session` cookie — a signed,
 * stateless token (HMAC) issued by `/api/auth/verify-otp` and stored only in
 * the cookie (httpOnly + secure). `getCurrentUser()` is the single seam used
 * across pages and API routes.
 */
import "server-only";
import { getSessionToken } from "./session";
import { verifySession } from "./session-token";

export interface SessionUser {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: "admin" | "hr" | "member";
}

export const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

/** Resolve the signed-in user from the signed session cookie, or null. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = await getSessionToken();
  if (!token) return null;
  return verifySession(token);
}

/**
 * Tenant scope for the current request. In a real multi-tenant deployment
 * this would come from the tenant context (subdomain / header); here it is
 * the session user's tenant with a demo fallback so unauthenticated requests
 * (e.g. the login page) still resolve a theme.
 */
export async function getTenantId(): Promise<string> {
  const user = await getCurrentUser();
  return user?.tenantId ?? process.env.DEMO_TENANT_ID ?? DEFAULT_TENANT_ID;
}

/** Current user id, or null when signed out. */
export async function getUserId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.id ?? null;
}
