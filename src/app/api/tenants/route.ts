import { asc, desc, eq } from "drizzle-orm";
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

/** GET /api/tenants — organizations the user belongs to (primary first). */
export const GET = route(async () => {
  const user = await requireUser();
  const { db, pool } = await getDb();
  const { tenants, userTenants, users } = await import("@db/schema");
  try {
    // Super-admins see every tenant instead of just their memberships.
    const me = await db
      .select({ superAdmin: users.superAdmin })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);
    if (me[0]?.superAdmin) {
      const all = await db
        .select({
          id: tenants.id,
          name: tenants.name,
          slug: tenants.slug,
          logo: tenants.logo,
        })
        .from(tenants)
        .orderBy(asc(tenants.name));
      return ok(all.map((t) => ({ ...t, role: "admin", isPrimary: false })));
    }

    const mine = await db
      .select({
        id: tenants.id,
        name: tenants.name,
        slug: tenants.slug,
        logo: tenants.logo,
        role: userTenants.role,
        isPrimary: userTenants.isPrimary,
      })
      .from(userTenants)
      .innerJoin(tenants, eq(tenants.id, userTenants.tenantId))
      .where(eq(userTenants.userId, user.id))
      .orderBy(desc(userTenants.isPrimary), asc(tenants.name));
    return ok(mine);
  } finally {
    await pool.end();
  }
});

/** POST /api/tenants — super-admin: create a company (+ optional admin). */
export const POST = route(async (request: Request) => {
  const user = await requireUser();
  await requireSuperAdmin(user);

  const body = await parseJson(request);
  if (!body) throw new ApiError(400, "Invalid request body");

  const name = asString(body.name).trim();
  if (!name) throw new ApiError(400, "Organization name is required");

  const { db, pool } = await getDb();
  const { tenants, users, userTenants } = await import("@db/schema");
  try {
    const slug =
      slugify(asString(body.slug).trim()) || slugify(name) || "workspace";
    const taken = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.slug, slug))
      .limit(1);
    if (taken[0]) throw new ApiError(409, "Slug already in use");

    const [tenant] = await db
      .insert(tenants)
      .values({
        name,
        slug,
        timezone: asString(body.timezone).trim() || "UTC",
        currency: asString(body.currency).trim() || "USD",
      })
      .returning();

    let admin: { id: string; email: string } | null = null;
    const adminEmail = asString(body.adminEmail).trim().toLowerCase();

    // If the creator has no memberships yet, their new org becomes primary.
    const existingMembership = await db
      .select({ id: userTenants.id })
      .from(userTenants)
      .where(eq(userTenants.userId, user.id))
      .limit(1);
    const creatorIsNew = !existingMembership[0];

    if (adminEmail) {
      if (!EMAIL_RE.test(adminEmail)) {
        throw new ApiError(400, "A valid admin email is required");
      }
      let u = (
        await db
          .select({ id: users.id, email: users.email })
          .from(users)
          .where(eq(users.email, adminEmail))
          .limit(1)
      )[0];
      if (!u) {
        const inserted = await db
          .insert(users)
          .values({
            email: adminEmail,
            name: adminEmail.split("@")[0] || "Admin",
          })
          .returning({ id: users.id, email: users.email });
        u = inserted[0];
      }
      await db.insert(userTenants).values({
        userId: u.id,
        tenantId: tenant.id,
        role: "admin",
        status: "active",
        // Only mark primary when it's the creator's first org.
        isPrimary: u.id === user.id ? creatorIsNew : true,
      });
      admin = { id: u.id, email: u.email };
    }

    // The creator joins as an admin too, so they can switch into the org.
    // (Skipped when the admin email above is the creator themselves.)
    if (!admin || admin.id !== user.id) {
      await db.insert(userTenants).values({
        userId: user.id,
        tenantId: tenant.id,
        role: "admin",
        status: "active",
        isPrimary: admin ? false : creatorIsNew,
      });
    }

    await addAudit({
      tenantId: tenant.id,
      userId: user.id,
      actorName: user.name,
      action: "tenant.create",
      target: name,
      category: "settings",
    });
    return ok({ ...tenant, admin });
  } finally {
    await pool.end();
  }
});
