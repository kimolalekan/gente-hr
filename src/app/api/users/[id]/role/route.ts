import { eq } from "drizzle-orm";
import {
  ApiError,
  addAudit,
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

/** PATCH /api/users/[id]/role — super-admin: grant / revoke global role. */
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
    if (typeof body.superAdmin !== "boolean") {
      throw new ApiError(400, "superAdmin must be a boolean");
    }

    const { db, pool } = await getDb();
    const { users } = await import("@db/schema");
    try {
      const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
      const target = rows[0];
      if (!target) throw new ApiError(404, "User not found");

      const [updated] = await db
        .update(users)
        .set({ superAdmin: body.superAdmin, updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning();

      await addAudit({
        tenantId: user.tenantId,
        userId: user.id,
        actorName: user.name,
        action: "users.role",
        target: target.email,
        category: "settings",
      });
      return ok(updated);
    } finally {
      await pool.end();
    }
  },
);
