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
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES = ["admin", "hr", "member"];

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

/**
 * POST /api/tenants/[id]/members — super-admin: add a user to a tenant.
 * Creates the user account first when it doesn't exist yet.
 */
export const POST = route(
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

    const email = asString(body.email).trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      throw new ApiError(400, "A valid email is required");
    }
    const role = asString(body.role).trim();
    if (!ROLES.includes(role)) {
      throw new ApiError(400, "Invalid role");
    }

    const { db, pool } = await getDb();
    const { tenants, users, userTenants } = await import("@db/schema");
    try {
      const tenantRows = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
      if (!tenantRows[0]) throw new ApiError(404, "Tenant not found");

      let member = (
        await db
          .select({ id: users.id, email: users.email, name: users.name })
          .from(users)
          .where(eq(users.email, email))
          .limit(1)
      )[0];
      if (!member) {
        const inserted = await db
          .insert(users)
          .values({ email, name: email.split("@")[0] || "User" })
          .returning({ id: users.id, email: users.email, name: users.name });
        member = inserted[0];
      }

      const existing = await db
        .select({ id: userTenants.id })
        .from(userTenants)
        .where(and(eq(userTenants.userId, member.id), eq(userTenants.tenantId, id)))
        .limit(1);
      if (existing[0]) throw new ApiError(409, "User is already a member");

      const [membership] = await db
        .insert(userTenants)
        .values({ userId: member.id, tenantId: id, role, status: "active", isPrimary: false })
        .returning();

      await addAudit({
        tenantId: id,
        userId: user.id,
        actorName: user.name,
        action: "tenant.addMember",
        target: email,
        category: "settings",
      });
      return ok({ ...membership, name: member.name, email: member.email });
    } finally {
      await pool.end();
    }
  },
);
