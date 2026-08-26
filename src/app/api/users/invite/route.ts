import { asc, eq } from "drizzle-orm";
import {
  ApiError,
  addAudit,
  asString,
  getDb,
  ok,
  parseJson,
  recordEmail,
  requireRole,
  route,
} from "@/lib/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/users/invite — admin: invite a new team member as an
 * admin or HR user. Admins get a membership in EVERY tenant; HR members
 * belong to the inviter's tenant only (RBAC is per tenant, see schema).
 * Sends the invite email and audits.
 */
export const POST = route(async (request: Request) => {
  const user = await requireRole(["admin"]);
  const body = await parseJson(request);
  if (!body) throw new ApiError(400, "Invalid request body");

  const fullName = asString(body.fullName).trim();
  if (!fullName) throw new ApiError(400, "Full name is required");
  const email = asString(body.email).trim().toLowerCase();
  if (!EMAIL_RE.test(email))
    throw new ApiError(400, "A valid email is required");
  const role = asString(body.role).trim() || "admin";
  if (role !== "admin" && role !== "hr") {
    throw new ApiError(400, "role must be 'admin' or 'hr'");
  }

  const { db, pool } = await getDb();
  const { users, userTenants, tenants } = await import("@db/schema");
  try {
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (existing[0]) {
      throw new ApiError(409, "A user with this email already exists");
    }

    const [created] = await db
      .insert(users)
      .values({ email, name: fullName })
      .returning();

    let memberTenants: { id: string; name: string }[] = [];
    if (role === "admin") {
      // Admins get access to every organization (existing behaviour).
      const allTenants = await db
        .select({ id: tenants.id, name: tenants.name })
        .from(tenants)
        .orderBy(asc(tenants.name));
      if (allTenants.length > 0) {
        await db.insert(userTenants).values(
          allTenants.map((t) => ({
            userId: created.id,
            tenantId: t.id,
            role: "admin" as const,
            status: "active",
            isPrimary: false,
          })),
        );
      }
      memberTenants = allTenants.map((t) => ({ id: t.id, name: t.name }));
    } else {
      // HR members are scoped to the inviting organization.
      await db.insert(userTenants).values({
        userId: created.id,
        tenantId: user.tenantId,
        role: "hr",
        status: "active",
        isPrimary: true,
      });
      const [tenant] = await db
        .select({ id: tenants.id, name: tenants.name })
        .from(tenants)
        .where(eq(tenants.id, user.tenantId))
        .limit(1);
      if (tenant) memberTenants = [{ id: tenant.id, name: tenant.name }];
    }

    await recordEmail({
      tenantId: user.tenantId,
      to: email,
      templateKey: "invite",
    });
    await addAudit({
      tenantId: user.tenantId,
      userId: user.id,
      actorName: user.name,
      action: "users.invite",
      target: email,
      category: "settings",
    });

    return ok({
      id: created.id,
      name: created.name,
      email: created.email,
      role,
      status: created.status,
      superAdmin: created.superAdmin,
      tenants: memberTenants.map((t) => ({
        tenantId: t.id,
        name: t.name,
      })),
    });
  } finally {
    await pool.end();
  }
});
