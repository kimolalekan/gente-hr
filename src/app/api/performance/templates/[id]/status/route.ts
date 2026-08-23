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

/** Activate / deactivate a template (admin, hr). */
export const PATCH = route(
  async (
    request: Request,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const user = await requireRole(["admin", "hr"]);
    const { id } = await params;
    const body = await parseJson(request);
    if (!body || body.active === undefined) {
      throw new ApiError(400, "active is required");
    }
    const active = asBool(body.active);

    const { db, pool } = await getDb();
    try {
      const { performanceTemplates } = await import("@db/schema");
      const [existing] = await db
        .select({ id: performanceTemplates.id })
        .from(performanceTemplates)
        .where(
          and(
            eq(performanceTemplates.id, id),
            eq(performanceTemplates.tenantId, user.tenantId),
          ),
        )
        .limit(1);
      if (!existing) throw new ApiError(404, "Template not found");

      const [updated] = await db
        .update(performanceTemplates)
        .set({ active, updatedAt: new Date() })
        .where(eq(performanceTemplates.id, id))
        .returning();

      await addAudit({
        tenantId: user.tenantId,
        userId: user.id,
        actorName: user.name,
        action: "performance.template.status",
        target: id,
        category: "performance",
      });
      return ok(updated);
    } finally {
      await pool.end();
    }
  },
);
