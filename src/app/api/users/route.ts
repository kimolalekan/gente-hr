import { and, asc, desc, eq, ilike, inArray, or } from "drizzle-orm";
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
 * GET /api/users — admin: list team members with per-tenant access
 * (roles admin + hr), each with the tenants they belong to and their
 * highest role. Supports ?q= and pagination.
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
    const conditions: (SQL | undefined)[] = [
      inArray(userTenants.role, ["admin", "hr"]),
    ];
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
        role: userTenants.role,
      })
      .from(userTenants)
      .innerJoin(users, eq(users.id, userTenants.userId))
      .innerJoin(tenants, eq(tenants.id, userTenants.tenantId))
      .where(and(...conditions))
      .orderBy(desc(users.createdAt), asc(tenants.name));

    const grouped = new Map<
      string,
      {
        id: string;
        name: string;
        email: string;
        status: string;
        superAdmin: boolean;
        createdAt: Date;
        role: "admin" | "hr";
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
          role: r.role === "hr" ? "hr" : "admin",
          tenants: [],
        };
        grouped.set(r.id, entry);
      }
      // Highest role wins when a user holds multiple memberships.
      if (r.role === "admin") entry.role = "admin";
      entry.tenants.push({ tenantId: r.tenantId, name: r.tenantName });
    }

    return ok(paginate([...grouped.values()], page, pageSize));
  } finally {
    await pool.end();
  }
});
