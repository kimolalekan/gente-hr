import { and, desc, eq, ilike, or } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import {
  asInt,
  asString,
  getDb,
  ok,
  paginate,
  requireRole,
  route,
} from "@/lib/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/users — admin: list admin users (all-tenant access), each with
 * the tenants they are an admin of. Supports ?q= and pagination.
 */
export const GET = route(async (request: Request) => {
  await requireRole(["admin"]);
  const url = new URL(request.url);
  const q = asString(url.searchParams.get("q")).trim();
  const page = asInt(url.searchParams.get("page"), 1);
  const pageSize = asInt(url.searchParams.get("pageSize"), 20);

  const { db, pool } = await getDb();
  const { users, userTenants, tenants } = await import("@db/schema");
  try {
    const conditions: (SQL | undefined)[] = [eq(userTenants.role, "admin")];
    if (q) {
      conditions.push(
        or(ilike(users.name, `%${q}%`), ilike(users.email, `%${q}%`)),
      );
    }

    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        status: users.status,
        superAdmin: users.superAdmin,
        createdAt: users.createdAt,
        tenantId: tenants.id,
        tenantName: tenants.name,
      })
      .from(userTenants)
      .innerJoin(users, eq(users.id, userTenants.userId))
      .innerJoin(tenants, eq(tenants.id, userTenants.tenantId))
      .where(and(...conditions))
      .orderBy(desc(users.createdAt));

    const grouped = new Map<
      string,
      {
        id: string;
        name: string;
        email: string;
        status: string;
        superAdmin: boolean;
        createdAt: Date;
        tenants: { tenantId: string; name: string }[];
      }
    >();
    for (const r of rows) {
      let entry = grouped.get(r.id);
      if (!entry) {
        entry = {
          id: r.id,
          name: r.name,
          email: r.email,
          status: r.status,
          superAdmin: r.superAdmin,
          createdAt: r.createdAt,
          tenants: [],
        };
        grouped.set(r.id, entry);
      }
      entry.tenants.push({ tenantId: r.tenantId, name: r.tenantName });
    }

    return ok(paginate([...grouped.values()], page, pageSize));
  } finally {
    await pool.end();
  }
});
