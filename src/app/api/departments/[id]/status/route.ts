import { and, eq } from "drizzle-orm";
import {
  ApiError,
  addAudit,
  asBool,
  getDb,
  ok,
  parseJson,
  requireRole,
  route,
} from "@/lib/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-fA-F-]{8,}$/;

/** PATCH /api/departments/[id]/status — enable / disable a department. */
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
    if (body.active === undefined) {
      throw new ApiError(400, "active is required");
    }
    const active = asBool(body.active);

    const { db, pool } = await getDb();
    const { departments } = await import("@db/schema");
    try {
      const rows = await db
        .select()
        .from(departments)
        .where(and(eq(departments.id, id), eq(departments.tenantId, user.tenantId)))
        .limit(1);
      if (!rows[0]) throw new ApiError(404, "Department not found");

      const [updated] = await db
        .update(departments)
        .set({ active, updatedAt: new Date() })
        .where(and(eq(departments.id, id), eq(departments.tenantId, user.tenantId)))
        .returning();

      await addAudit({
        tenantId: user.tenantId,
        userId: user.id,
        actorName: user.name,
        action: "department.status",
        target: updated.name,
        category: "settings",
      });
      return ok(updated);
    } finally {
      await pool.end();
    }
  },
);
