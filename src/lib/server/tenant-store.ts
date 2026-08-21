/**
 * Tenant store — the organizations a user belongs to (for the header
 * organization switcher).
 *
 * When `DATABASE_URL` is set, tenants come from `user_tenants ⋈ tenants`.
 * Without a database (local demo), a fixed demo pair is returned so the
 * switcher is functional; production never falls back.
 */
import "server-only";
import { and, asc, eq } from "drizzle-orm";
import type { SessionUser } from "./auth";

export interface TenantSummary {
  tenantId: string;
  name: string;
  slug: string;
  role: SessionUser["role"];
  isPrimary: boolean;
}

/** Demo fallback — matches what `pnpm db:seed` creates. */
const DEMO_TENANTS: TenantSummary[] = [
  {
    tenantId: "00000000-0000-0000-0000-000000000001",
    name: "Acme Inc.",
    slug: "acme",
    role: "admin",
    isPrimary: true,
  },
  {
    tenantId: "00000000-0000-0000-0000-000000000004",
    name: "Globex Corp.",
    slug: "globex",
    role: "hr",
    isPrimary: false,
  },
];

const DB_PATH_ENABLED = Boolean(process.env.DATABASE_URL);

/** Circuit breaker: stop retrying the DB for the rest of the process. */
let dbAvailable = DB_PATH_ENABLED;

function shouldUseDb(): boolean {
  return DB_PATH_ENABLED && dbAvailable;
}

function markDbUnavailable(error: unknown): void {
  if (!dbAvailable) return;
  dbAvailable = false;
  console.warn(
    `[tenant-store] Database unreachable — using the demo tenant list. ${(error as Error).message}`,
  );
}

function normalizeRole(role: string): SessionUser["role"] {
  if (role === "admin" || role === "hr") return role;
  return "member";
}

function demoFallback(): TenantSummary[] {
  return process.env.NODE_ENV === "production" ? [] : DEMO_TENANTS;
}

/** Organizations the user belongs to (primary first). */
export async function getUserTenants(userId: string): Promise<TenantSummary[]> {
  if (shouldUseDb()) {
    try {
      return await getUserTenantsDb(userId);
    } catch (error) {
      markDbUnavailable(error);
    }
  }
  return demoFallback();
}

/** A tenant the user may switch to, or null. */
export async function getTenantForSwitch(
  userId: string,
  tenantId: string,
): Promise<TenantSummary | null> {
  if (shouldUseDb()) {
    try {
      return await getTenantForSwitchDb(userId, tenantId);
    } catch (error) {
      markDbUnavailable(error);
    }
  }
  return demoFallback().find((tenant) => tenant.tenantId === tenantId) ?? null;
}

/* ------------------------------------------------------------------ */
/* Postgres (Drizzle) implementations — lazily imported                 */
/* ------------------------------------------------------------------ */

async function getUserTenantsDb(userId: string): Promise<TenantSummary[]> {
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const { Pool } = await import("pg");
  const { tenants, userTenants } = await import("@db/schema");

  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
  try {
    const db = drizzle(pool);
    const rows = await db
      .select({
        tenantId: tenants.id,
        name: tenants.name,
        slug: tenants.slug,
        role: userTenants.role,
        isPrimary: userTenants.isPrimary,
      })
      .from(userTenants)
      .innerJoin(tenants, eq(tenants.id, userTenants.tenantId))
      .where(eq(userTenants.userId, userId))
      .orderBy(asc(userTenants.isPrimary));
    return rows.map((row) => ({ ...row, role: normalizeRole(row.role) }));
  } finally {
    await pool.end();
  }
}

async function getTenantForSwitchDb(
  userId: string,
  tenantId: string,
): Promise<TenantSummary | null> {
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const { Pool } = await import("pg");
  const { tenants, userTenants } = await import("@db/schema");

  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
  try {
    const db = drizzle(pool);
    const rows = await db
      .select({
        tenantId: tenants.id,
        name: tenants.name,
        slug: tenants.slug,
        role: userTenants.role,
        isPrimary: userTenants.isPrimary,
      })
      .from(userTenants)
      .innerJoin(tenants, eq(tenants.id, userTenants.tenantId))
      .where(
        and(eq(userTenants.userId, userId), eq(userTenants.tenantId, tenantId)),
      )
      .limit(1);
    const row = rows[0];
    return row ? { ...row, role: normalizeRole(row.role) } : null;
  } finally {
    await pool.end();
  }
}
