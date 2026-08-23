/**
 * Tenant store — the organizations a user belongs to (for the header
 * organization switcher).
 *
 * Tenants come from `user_tenants ⋈ tenants` (Postgres only — there is NO
 * demo fallback; authentication already requires a database, so the store
 * always has one available). The header additionally refreshes the list from
 * `GET /api/tenants` so the dropdown reflects the API.
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

function normalizeRole(role: string): SessionUser["role"] {
  if (role === "admin" || role === "hr") return role;
  return "member";
}

/** Organizations the user belongs to (primary first). */
export async function getUserTenants(userId: string): Promise<TenantSummary[]> {
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

/** A tenant the user may switch to, or null. */
export async function getTenantForSwitch(
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
