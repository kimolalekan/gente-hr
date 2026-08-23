import { eq } from "drizzle-orm";
import {
  ApiError,
  addAudit,
  asString,
  getDb,
  ok,
  parseJson,
  requireRole,
  route,
} from "@/lib/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-fA-F-]{8,}$/;

/** PATCH /api/users/[id] — admin: activate / deactivate a user account. */
export const PATCH = route(
  async (
    request: Request,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const user = await requireRole(["admin"]);
    const { id } = await params;
    if (!UUID_RE.test(id)) throw new ApiError(404, "Not found");

    const body = await parseJson(request);
    if (!body) throw new ApiError(400, "Invalid request body");

    const status = asString(body.status).trim();
    if (status !== "active" && status !== "inactive") {
      throw new ApiError(400, "Invalid status");
    }

    const { db, pool } = await getDb();
    const { users } = await import("@db/schema");
    try {
      const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
      const target = rows[0];
      if (!target) throw new ApiError(404, "User not found");

      const [updated] = await db
        .update(users)
        .set({ status, updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning();

      await addAudit({
        tenantId: user.tenantId,
        userId: user.id,
        actorName: user.name,
        action: "users.update",
        target: target.email,
        category: "settings",
      });
      return ok(updated);
    } finally {
      await pool.end();
    }
  },
);
