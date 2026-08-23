import { and, eq, ne } from "drizzle-orm";
import {
  ApiError,
  addAudit,
  asString,
  getDb,
  ok,
  parseJson,
  requireUser,
  route,
} from "@/lib/server/api";
import type { SessionUser } from "@/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-fA-F-]{8,}$/;
const SUBSCRIPTION_TIERS = ["free", "growth", "enterprise"];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function requireSuperAdmin(user: SessionUser): Promise<void> {
  const { db, pool } = await getDb();
  const { users } = await import("@db/schema");
  try {
    const rows = await db
      .select({ superAdmin: users.superAdmin })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);
    if (!rows[0]?.superAdmin) {
      throw new ApiError(403, "You don't have permission to do this");
    }
  } finally {
    await pool.end();
  }
}

/** PATCH /api/tenants/[id] — super-admin: edit / suspend / change tier. */
export const PATCH = route(
  async (
    request: Request,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const user = await requireUser();
    await requireSuperAdmin(user);

    const { id } = await params;
    if (!UUID_RE.test(id)) throw new ApiError(404, "Not found");

    const body = await parseJson(request);
    if (!body) throw new ApiError(400, "Invalid request body");

    const { db, pool } = await getDb();
    const { tenants } = await import("@db/schema");
    try {
      const rows = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
      const tenant = rows[0];
      if (!tenant) throw new ApiError(404, "Tenant not found");

      const set: Partial<typeof tenants.$inferInsert> = {};
      if (body.name !== undefined) {
        const name = asString(body.name).trim();
        if (!name) throw new ApiError(400, "Name cannot be empty");
        set.name = name;
      }
      if (body.slug !== undefined) {
        const slug = slugify(asString(body.slug)) || slugify(tenant.name) || "workspace";
        if (slug !== tenant.slug) {
          const dup = await db
            .select({ id: tenants.id })
            .from(tenants)
            .where(and(eq(tenants.slug, slug), ne(tenants.id, id)))
            .limit(1);
          if (dup[0]) throw new ApiError(409, "Slug already in use");
          set.slug = slug;
        }
      }
      if (body.status !== undefined) {
        const status = asString(body.status).trim();
        if (status !== "active" && status !== "suspended") {
          throw new ApiError(400, "Invalid status");
        }
        set.status = status;
      }
      if (body.subscriptionTier !== undefined) {
        const tier = asString(body.subscriptionTier).trim();
        if (!SUBSCRIPTION_TIERS.includes(tier)) {
          throw new ApiError(400, "Invalid subscription tier");
        }
        set.subscriptionTier = tier;
      }
      if (body.timezone !== undefined) {
        const tz = asString(body.timezone).trim();
        if (tz) set.timezone = tz;
      }
      if (body.currency !== undefined) {
        const currency = asString(body.currency).trim();
        if (currency) set.currency = currency;
      }
      if (Object.keys(set).length === 0) {
        throw new ApiError(400, "Nothing to update");
      }

      const [updated] = await db
        .update(tenants)
        .set({ ...set, updatedAt: new Date() })
        .where(eq(tenants.id, id))
        .returning();

      await addAudit({
        tenantId: id,
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
  },
);
