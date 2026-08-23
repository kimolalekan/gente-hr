import { and, eq } from "drizzle-orm";
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
const ROLES = ["admin", "hr", "member"];
const STATUSES = ["active", "inactive"];

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

/** PATCH /api/tenants/[id]/members/[userId] — change role/status. */
export const PATCH = route(
  async (
    request: Request,
    { params }: { params: Promise<{ id: string; userId: string }> },
  ) => {
    const user = await requireUser();
    await requireSuperAdmin(user);

    const { id, userId } = await params;
    if (!UUID_RE.test(id) || !UUID_RE.test(userId)) {
      throw new ApiError(404, "Not found");
    }

    const body = await parseJson(request);
    if (!body) throw new ApiError(400, "Invalid request body");

    const { db, pool } = await getDb();
    const { userTenants } = await import("@db/schema");
    try {
      const rows = await db
        .select()
        .from(userTenants)
        .where(and(eq(userTenants.userId, userId), eq(userTenants.tenantId, id)))
        .limit(1);
      if (!rows[0]) throw new ApiError(404, "Membership not found");

      const set: Partial<typeof userTenants.$inferInsert> = {};
      if (body.role !== undefined) {
        const role = asString(body.role).trim();
        if (!ROLES.includes(role)) throw new ApiError(400, "Invalid role");
        set.role = role;
      }
      if (body.status !== undefined) {
        const status = asString(body.status).trim();
        if (!STATUSES.includes(status)) throw new ApiError(400, "Invalid status");
        set.status = status;
      }
      if (Object.keys(set).length === 0) {
        throw new ApiError(400, "Nothing to update");
      }

      const [updated] = await db
        .update(userTenants)
        .set(set)
        .where(and(eq(userTenants.userId, userId), eq(userTenants.tenantId, id)))
        .returning();

      await addAudit({
        tenantId: id,
        userId: user.id,
        actorName: user.name,
        action: "tenant.updateMember",
        target: userId,
        category: "settings",
      });
      return ok(updated);
    } finally {
      await pool.end();
    }
  },
);

/** DELETE /api/tenants/[id]/members/[userId] — remove membership. */
export const DELETE = route(
  async (
    _request: Request,
    { params }: { params: Promise<{ id: string; userId: string }> },
  ) => {
    const user = await requireUser();
    await requireSuperAdmin(user);

    const { id, userId } = await params;
    if (!UUID_RE.test(id) || !UUID_RE.test(userId)) {
      throw new ApiError(404, "Not found");
    }

    const { db, pool } = await getDb();
    const { userTenants } = await import("@db/schema");
    try {
      const rows = await db
        .select()
        .from(userTenants)
        .where(and(eq(userTenants.userId, userId), eq(userTenants.tenantId, id)))
        .limit(1);
      if (!rows[0]) throw new ApiError(404, "Membership not found");

      await db
        .delete(userTenants)
        .where(and(eq(userTenants.userId, userId), eq(userTenants.tenantId, id)));

      await addAudit({
        tenantId: id,
        userId: user.id,
        actorName: user.name,
        action: "tenant.removeMember",
        target: userId,
        category: "settings",
      });
      return ok({ removed: true });
    } finally {
      await pool.end();
    }
  },
);
