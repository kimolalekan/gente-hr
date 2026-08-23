import { eq } from "drizzle-orm";
import {
  ApiError,
  addAudit,
  asString,
  getDb,
  ok,
  parseJson,
  requireRole,
  requireUser,
  route,
} from "@/lib/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/tenants/current — active tenant profile. */
export const GET = route(async () => {
  const user = await requireUser();
  const { db, pool } = await getDb();
  const { tenants } = await import("@db/schema");
  try {
    const rows = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, user.tenantId))
      .limit(1);
    const tenant = rows[0];
    if (!tenant) throw new ApiError(404, "Tenant not found");
    return ok(tenant);
  } finally {
    await pool.end();
  }
});

/** PATCH /api/tenants/current — admin: update company profile. */
export const PATCH = route(async (request: Request) => {
  const user = await requireRole(["admin"]);
  const body = await parseJson(request);
  if (!body) throw new ApiError(400, "Invalid request body");

  const { db, pool } = await getDb();
  const { tenants } = await import("@db/schema");
  try {
    const rows = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, user.tenantId))
      .limit(1);
    const tenant = rows[0];
    if (!tenant) throw new ApiError(404, "Tenant not found");

    const set: Partial<typeof tenants.$inferInsert> = {};
    if (body.name !== undefined) {
      const name = asString(body.name).trim();
      if (!name) throw new ApiError(400, "Name cannot be empty");
      set.name = name;
    }
    if (body.address !== undefined) {
      set.address = asString(body.address).trim() || null;
    }
    if (body.timezone !== undefined) {
      const tz = asString(body.timezone).trim();
      if (tz) set.timezone = tz;
    }
    if (body.currency !== undefined) {
      const currency = asString(body.currency).trim();
      if (currency) set.currency = currency;
    }
    if (body.dateFormat !== undefined) {
      const dateFormat = asString(body.dateFormat).trim();
      if (dateFormat) set.dateFormat = dateFormat;
    }
    if (body.logo !== undefined) {
      set.logo = asString(body.logo).trim() || null;
    }
    if (Object.keys(set).length === 0) {
      throw new ApiError(400, "Nothing to update");
    }

    const [updated] = await db
      .update(tenants)
      .set({ ...set, updatedAt: new Date() })
      .where(eq(tenants.id, user.tenantId))
      .returning();

    await addAudit({
      tenantId: user.tenantId,
      userId: user.id,
      actorName: user.name,
      action: "tenant.update",
      target: updated.name,
      category: "settings",
    });
    return ok(updated);
  } finally {
    await pool.end();
  }
});
