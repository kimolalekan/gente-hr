import type { Page } from "@playwright/test";
import { signSession } from "../../src/lib/server/session-token";
import { SESSION_COOKIE } from "../../src/lib/session-cookie";

/**
 * Seed identities used by the e2e tests (see db/seed.ts). Override via env
 * vars when running against a different dataset.
 */
export const E2E_ADMIN = {
  id: process.env.E2E_ADMIN_USER_ID ?? "00000000-0000-0000-0000-000000000002",
  tenantId:
    process.env.E2E_ADMIN_TENANT_ID ?? "00000000-0000-0000-0000-000000000001",
  name: process.env.E2E_ADMIN_NAME ?? "Ada Admin",
  email: process.env.E2E_ADMIN_EMAIL ?? "admin@gente.dev",
} as const;

/**
 * Sign in without the OTP flow: the session is a stateless HMAC-signed cookie,
 * so we issue one directly with the same secret the server uses. The global
 * setup loads .env.local, keeping the secret in sync.
 */
export async function signInAsAdmin(page: Page): Promise<void> {
  const token = signSession({
    id: E2E_ADMIN.id,
    tenantId: E2E_ADMIN.tenantId,
    name: E2E_ADMIN.name,
    email: E2E_ADMIN.email,
    role: "admin",
  });
  await page.context().addCookies([
    {
      name: SESSION_COOKIE,
      value: token,
      domain: "localhost",
      path: "/",
      sameSite: "Lax",
    },
  ]);
}
