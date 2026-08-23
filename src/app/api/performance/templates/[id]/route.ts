import { and, eq } from "drizzle-orm";
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

/** Validate + normalize `sections: [{ name, questions: string[] }]`. */
function normalizeSections(
  value: unknown,
): Array<{ name: string; questions: string[] }> {
  if (!Array.isArray(value)) {
    throw new ApiError(422, "sections must be an array");
  }
  return value.map((sec, index) => {
    if (!sec || typeof sec !== "object" || Array.isArray(sec)) {
      throw new ApiError(422, `Invalid section at index ${index}`);
    }
    const section = sec as Record<string, unknown>;
    const name = asString(section.name).trim();
    if (!name) throw new ApiError(422, `Section ${index + 1} needs a name`);
    if (!Array.isArray(section.questions)) {
      throw new ApiError(422, `Section "${name}" questions must be an array`);
    }
    const questions = section.questions
      .map((q) => asString(q).trim())
      .filter(Boolean);
    return { name, questions };
  });
}

/** Edit a template (admin, hr). */
export const PATCH = route(
  async (
    request: Request,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const user = await requireRole(["admin", "hr"]);
    const { id } = await params;
    const body = await parseJson(request);
    if (!body) throw new ApiError(400, "Invalid request body");

    const { db, pool } = await getDb();
    try {
      const { performanceTemplates } = await import("@db/schema");
      const [existing] = await db
        .select()
        .from(performanceTemplates)
        .where(
          and(
            eq(performanceTemplates.id, id),
            eq(performanceTemplates.tenantId, user.tenantId),
          ),
        )
        .limit(1);
      if (!existing) throw new ApiError(404, "Template not found");

      const set: Partial<typeof performanceTemplates.$inferInsert> = {};
      if (body.name !== undefined) {
        const name = asString(body.name).trim();
        if (!name) throw new ApiError(422, "Template name is required");
        set.name = name;
      }
      if (body.description !== undefined) {
        set.description = asString(body.description).trim() || null;
      }
      if (body.sections !== undefined) {
        set.sections = normalizeSections(body.sections);
      }

      const [updated] = await db
        .update(performanceTemplates)
        .set({ ...set, updatedAt: new Date() })
        .where(eq(performanceTemplates.id, id))
        .returning();

      await addAudit({
        tenantId: user.tenantId,
        userId: user.id,
        actorName: user.name,
        action: "performance.template.update",
        target: id,
        category: "performance",
      });
      return ok(updated);
    } finally {
      await pool.end();
    }
  },
);

/** Delete a template (409 if it is referenced by reviews). */
export const DELETE = route(
  async (
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const user = await requireRole(["admin", "hr"]);
    const { id } = await params;

    const { db, pool } = await getDb();
    try {
      const { performanceTemplates, reviews } = await import("@db/schema");
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

      const [inUse] = await db
        .select({ id: reviews.id })
        .from(reviews)
        .where(
          and(
            eq(reviews.tenantId, user.tenantId),
            eq(reviews.templateId, id),
          ),
        )
        .limit(1);
      if (inUse) {
        throw new ApiError(
          409,
          "Template is used by existing reviews and cannot be deleted",
        );
      }

      await db
        .delete(performanceTemplates)
        .where(eq(performanceTemplates.id, id));

      await addAudit({
        tenantId: user.tenantId,
        userId: user.id,
        actorName: user.name,
        action: "performance.template.delete",
        target: id,
        category: "performance",
      });
      return ok({ deleted: true });
    } finally {
      await pool.end();
    }
  },
);
