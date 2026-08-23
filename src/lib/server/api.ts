/**
 * Shared helpers for API route handlers: auth/role guards, response envelope,
 * JSON parsing, a per-call Drizzle connection, pagination and audit logging.
 */
import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getCurrentUser, type SessionUser } from "./auth";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export type Role = SessionUser["role"];

export function ok(data?: unknown, init?: { status?: number }) {
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

/** Route wrapper: guards, runs the handler, maps errors to responses. */
export function route<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse>,
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof ApiError) return fail(error.message, error.status);
      console.error("[api]", error);
      return fail("Something went wrong", 500);
    }
  };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, "Not signed in");
  return user;
}

export async function requireRole(roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    throw new ApiError(403, "You don't have permission to do this");
  }
  return user;
}

export function normalizeRole(role: string): Role {
  if (role === "admin" || role === "hr") return role;
  return "member";
}

export async function parseJson(
  request: Request,
): Promise<Record<string, unknown> | null> {
  try {
    const value = (await request.json()) as unknown;
    return value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export async function getDb() {
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const { Pool } = await import("pg");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
  return { db: drizzle(pool), pool };
}

/** Whether the user is a platform super-admin (sees every tenant, creates orgs). */
export async function isUserSuperAdmin(userId: string): Promise<boolean> {
  const { db, pool } = await getDb();
  const { users } = await import("@db/schema");
  try {
    const rows = await db
      .select({ superAdmin: users.superAdmin })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return rows[0]?.superAdmin ?? false;
  } finally {
    await pool.end();
  }
}

export function paginate<T>(items: T[], page = 1, pageSize = 20) {
  const p = Math.max(1, Math.floor(page) || 1);
  const ps = Math.max(1, Math.min(100, Math.floor(pageSize) || 20));
  const start = (p - 1) * ps;
  return {
    items: items.slice(start, start + ps),
    total: items.length,
    page: p,
    pageSize: ps,
  };
}

export function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function asInt(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : fallback;
}

export function asBool(value: unknown): boolean {
  return value === true || value === "true" || value === "1" || value === "on";
}

/**
 * Coerce a DB `numeric` value (returned as a string by Postgres) to a number,
 * preserving null/empty. Keeps API responses type-stable for the UI.
 */
export function toNumOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Normalize a date string to `YYYY-MM-DD`, or null when invalid. */
export function asDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(value.trim());
  if (!match) return null;
  const [, year, month, day] = match;
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (!y || m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

/**
 * Sanitize the tenant's employee-ID prefix (defaults to "EMP"). Used when
 * generating employee codes, e.g. `EMP-014`. Stored in tenant settings.
 */
export function employeeIdPrefix(
  settings: Record<string, unknown> | null | undefined,
): string {
  const raw = settings?.employeePrefix;
  if (typeof raw !== "string") return "EMP";
  const cleaned = raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
  return cleaned || "EMP";
}

/** Write an audit log row (best-effort). */
export async function addAudit(input: {
  tenantId: string;
  userId?: string | null;
  actorName?: string | null;
  action: string;
  target?: string;
  category: string;
}): Promise<void> {
  try {
    const { db, pool } = await getDb();
    const { auditLogs } = await import("@db/schema");
    await db.insert(auditLogs).values({
      tenantId: input.tenantId,
      userId: input.userId ?? null,
      actorName: input.actorName ?? null,
      action: input.action,
      target: input.target,
      category: input.category,
    });
    await pool.end();
  } catch {
    // Audit logging must never break the primary operation.
  }
}

/** Record an outgoing email (demo: logs to the table + console). */
export async function recordEmail(input: {
  tenantId: string;
  to: string;
  templateKey: string;
  provider?: string;
}): Promise<void> {
  try {
    const { db, pool } = await getDb();
    const { emailLogs } = await import("@db/schema");
    await db.insert(emailLogs).values({
      tenantId: input.tenantId,
      recipient: input.to,
      templateKey: input.templateKey,
      provider: input.provider ?? "console",
      status: "sent",
    });
    await pool.end();
  } catch {
    // Emails are best-effort in demo mode.
  }
  console.log(`[email:${input.templateKey}] → ${input.to}`);
}

/** Create an in-app notification row (best-effort, never throws). */
export async function notify(input: {
  tenantId: string;
  userId: string;
  type: string;
  title: string;
  body?: string;
  href?: string;
}): Promise<void> {
  try {
    const { db, pool } = await getDb();
    const { notifications } = await import("@db/schema");
    await db.insert(notifications).values({
      tenantId: input.tenantId,
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      href: input.href ?? null,
      read: false,
    });
    await pool.end();
  } catch {
    // Notifications are best-effort.
  }
}

/* ------------------------------------------------------------------ */
/* Signed tokens (e.g. onboarding completion links)                     */
/* ------------------------------------------------------------------ */

const TOKEN_SECRET =
  process.env.AUTH_SESSION_SECRET ?? "gente-dev-insecure-secret-change-me";

function signTokenPayload(payloadB64: string): string {
  return createHmac("sha256", TOKEN_SECRET)
    .update(payloadB64)
    .digest("base64url");
}

/**
 * Sign a short-lived single-purpose token (HMAC). Used for public invite
 * links (onboarding completion) so no server-side token storage is needed.
 */
export function signToken(
  payload: Record<string, string>,
  ttlSeconds = 60 * 60 * 24 * 14,
): string {
  const body = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const payloadB64 = Buffer.from(JSON.stringify(body)).toString("base64url");
  return `${payloadB64}.${signTokenPayload(payloadB64)}`;
}

/** Verify a signed token; returns the string payload fields or null. */
export function verifyToken(token: string): Record<string, string> | null {
  const [payloadB64, signature] = token.split(".");
  if (!payloadB64 || !signature) return null;
  const expected = signTokenPayload(payloadB64);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8"),
    ) as Record<string, unknown>;
    if (typeof payload.exp !== "number" || payload.exp * 1000 < Date.now()) {
      return null;
    }
    const fields: Record<string, string> = {};
    for (const [key, value] of Object.entries(payload)) {
      if (key !== "exp" && typeof value === "string") fields[key] = value;
    }
    return fields;
  } catch {
    return null;
  }
}

/** Resolve the employee row linked to a user (member self-service). */
export async function getEmployeeForUser(
  tenantId: string,
  userId: string,
): Promise<{ id: string; name: string; email: string } | null> {
  try {
    const { db, pool } = await getDb();
    const { employees } = await import("@db/schema");
    const rows = await db
      .select({
        id: employees.id,
        name: employees.name,
        email: employees.email,
      })
      .from(employees)
      .where(
        and(eq(employees.tenantId, tenantId), eq(employees.userId, userId)),
      )
      .limit(1);
    await pool.end();
    return rows[0] ?? null;
  } catch {
    return null;
  }
}
