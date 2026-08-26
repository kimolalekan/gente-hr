/**
 * Authentication store — OTP issuance/verification (Postgres only).
 *
 * OTP codes are stored exclusively in the `otp_codes` table — there is NO
 * in-memory fallback. Authentication therefore requires a running Postgres
 * (`DATABASE_URL`): start the DB, then `pnpm db:migrate && pnpm db:seed`.
 *
 * Sessions are NOT stored here: after a successful verification the route
 * issues a signed, stateless cookie (see session-token.ts).
 */
import "server-only";
import { and, desc, eq } from "drizzle-orm";
import type { SessionUser } from "./auth";
import {
  getTenantEmailSettings,
  sendOtpEmail,
  type OtpDelivery,
} from "./email";
import { getTenantBranding } from "./email-template";
import {
  generateOtpCode,
  hashToken,
  OTP_CODE_TTL_MINUTES,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_INTERVAL_MS,
  safeEqual,
} from "../otp";

export type OtpRequestResult =
  | {
      ok: true;
      exists: boolean;
      channel: OtpDelivery["channel"];
    }
  | { ok: false; reason: "rate_limited" };

export type OtpVerifyResult =
  | { ok: true; user: SessionUser }
  | { ok: false; reason: "not_found" | "invalid" | "expired" | "locked" };

/** Thrown when authentication can't reach Postgres (no memory fallback). */
export class DatabaseUnavailableError extends Error {
  constructor(cause?: unknown) {
    super(
      "Authentication requires a database. Start Postgres and run `pnpm db:migrate && pnpm db:seed`.",
      { cause },
    );
    this.name = "DatabaseUnavailableError";
  }
}

const DB_PATH_ENABLED = Boolean(process.env.DATABASE_URL);

/**
 * Circuit breaker: after the first failure we stop attempting DB connections
 * for the rest of the process and fail fast with `DatabaseUnavailableError`.
 */
let dbAvailable = DB_PATH_ENABLED;

function shouldUseDb(): boolean {
  return DB_PATH_ENABLED && dbAvailable;
}

function markDbUnavailable(error: unknown): void {
  if (!dbAvailable) return;
  dbAvailable = false;
  console.warn(
    `[auth-store] Database unreachable — OTP login requires Postgres. ${(error as Error).message}`,
  );
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export async function getUserByEmail(
  email: string,
): Promise<SessionUser | null> {
  const normalized = email.trim().toLowerCase();
  if (!shouldUseDb()) throw new DatabaseUnavailableError();
  try {
    return await getUserByEmailDb(normalized);
  } catch (error) {
    markDbUnavailable(error);
    throw new DatabaseUnavailableError(error);
  }
}

export async function requestOtp(email: string): Promise<OtpRequestResult> {
  const normalized = email.trim().toLowerCase();
  if (!shouldUseDb()) throw new DatabaseUnavailableError();
  try {
    return await requestOtpDb(normalized);
  } catch (error) {
    markDbUnavailable(error);
    throw new DatabaseUnavailableError(error);
  }
}

export async function verifyOtp(
  email: string,
  code: string,
): Promise<OtpVerifyResult> {
  const normalized = email.trim().toLowerCase();
  if (!shouldUseDb()) throw new DatabaseUnavailableError();
  try {
    return await verifyOtpDb(normalized, code);
  } catch (error) {
    markDbUnavailable(error);
    throw new DatabaseUnavailableError(error);
  }
}

/* ------------------------------------------------------------------ */
/* Postgres (Drizzle) implementations — lazily imported                */
/* ------------------------------------------------------------------ */

async function getUserByEmailDb(email: string): Promise<SessionUser | null> {
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const { Pool } = await import("pg");
  const { users, userTenants } = await import("@db/schema");

  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
  try {
    const db = drizzle(pool);
    // User + their primary tenant association (roles are per-tenant).
    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        tenantId: userTenants.tenantId,
        role: userTenants.role,
      })
      .from(users)
      .innerJoin(userTenants, eq(userTenants.userId, users.id))
      .where(
        and(
          eq(users.email, email),
          eq(users.status, "active"),
          eq(userTenants.status, "active"),
        ),
      )
      .orderBy(desc(userTenants.isPrimary))
      .limit(1);
    const row = rows[0];
    return row ? { ...row, role: normalizeRole(row.role) } : null;
  } finally {
    await pool.end();
  }
}

function normalizeRole(role: string): SessionUser["role"] {
  if (role === "admin" || role === "hr") return role;
  return "member";
}

async function requestOtpDb(email: string): Promise<OtpRequestResult> {
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const { Pool } = await import("pg");
  const { otpCodes } = await import("@db/schema");

  const user = await getUserByEmailDb(email);
  if (!user) return { ok: true, exists: false, channel: "console" };

  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
  try {
    const db = drizzle(pool);
    const latest = await db
      .select({ createdAt: otpCodes.createdAt })
      .from(otpCodes)
      .where(eq(otpCodes.userId, user.id))
      .orderBy(desc(otpCodes.createdAt))
      .limit(1);
    if (
      latest[0] &&
      Date.now() - latest[0].createdAt.getTime() < OTP_RESEND_INTERVAL_MS
    ) {
      return { ok: false, reason: "rate_limited" };
    }

    const code = generateOtpCode();
    await db.delete(otpCodes).where(eq(otpCodes.userId, user.id));
    await db.insert(otpCodes).values({
      userId: user.id,
      email: user.email,
      codeHash: hashToken(code),
      expiresAt: new Date(Date.now() + OTP_CODE_TTL_MINUTES * 60_000),
      attempts: 0,
    });

    const settings = await getTenantEmailSettings(user.tenantId);
    const delivery = await sendOtpEmail({
      to: user.email,
      code,
      expiresInMinutes: OTP_CODE_TTL_MINUTES,
      branding: await getTenantBranding(user.tenantId),
      // Sign-in codes go through the user's tenant email configuration too.
      provider: settings.provider,
      credentials: settings.credentials,
      fromName: settings.senderName,
      fromEmail: settings.senderEmail,
    });
    return {
      ok: true,
      exists: true,
      channel: delivery.channel,
    };
  } finally {
    await pool.end();
  }
}

async function verifyOtpDb(
  email: string,
  code: string,
): Promise<OtpVerifyResult> {
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const { Pool } = await import("pg");
  const { otpCodes } = await import("@db/schema");

  const user = await getUserByEmailDb(email);
  if (!user) return { ok: false, reason: "not_found" };

  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
  try {
    const db = drizzle(pool);
    const rows = await db
      .select()
      .from(otpCodes)
      .where(eq(otpCodes.userId, user.id))
      .orderBy(desc(otpCodes.createdAt))
      .limit(1);
    const otp = rows[0];
    if (!otp) return { ok: false, reason: "invalid" };
    if (otp.consumedAt) return { ok: false, reason: "invalid" };
    if (otp.expiresAt.getTime() < Date.now()) {
      await db.delete(otpCodes).where(eq(otpCodes.id, otp.id));
      return { ok: false, reason: "expired" };
    }
    if (otp.attempts >= OTP_MAX_ATTEMPTS) {
      await db.delete(otpCodes).where(eq(otpCodes.id, otp.id));
      return { ok: false, reason: "locked" };
    }
    if (!safeEqual(hashToken(code), otp.codeHash)) {
      const next = otp.attempts + 1;
      if (next >= OTP_MAX_ATTEMPTS) {
        await db.delete(otpCodes).where(eq(otpCodes.id, otp.id));
      } else {
        await db
          .update(otpCodes)
          .set({ attempts: next })
          .where(eq(otpCodes.id, otp.id));
      }
      return { ok: false, reason: "invalid" };
    }

    // Consume the code. The session itself is issued by the route as a
    // signed cookie — nothing is stored server-side.
    await db.delete(otpCodes).where(eq(otpCodes.userId, user.id));
    return { ok: true, user };
  } finally {
    await pool.end();
  }
}
