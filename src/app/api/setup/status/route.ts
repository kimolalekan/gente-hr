import { ok, route, getDb } from "@/lib/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public: whether the workspace has been provisioned (any tenants row exists).
 * Database errors resolve to `{ configured: false }` so the setup wizard stays
 * reachable before Postgres has been migrated/seeded.
 */
export const GET = route(async () => {
  try {
    const { db, pool } = await getDb();
    const { tenants } = await import("@db/schema");
    try {
      const rows = await db.select({ id: tenants.id }).from(tenants).limit(1);
      return ok({ configured: rows.length > 0 });
    } finally {
      await pool.end();
    }
  } catch {
    return ok({ configured: false });
  }
});
