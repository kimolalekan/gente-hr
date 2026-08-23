import { and, eq } from "drizzle-orm";
import {
  ApiError,
  addAudit,
  asString,
  getDb,
  notify,
  ok,
  parseJson,
  requireRole,
  route,
  toNumOrNull,
} from "@/lib/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Rating helper: 0-5 with one decimal place. */
function parseRating(value: unknown, field: string): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 5) {
    throw new ApiError(422, `${field} must be a number between 0 and 5`);
  }
  return Math.round(n * 10) / 10;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Submit the manager rating + feedback (admin, hr). */
export const PATCH = route(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireRole(["admin", "hr"]);
    const { id } = await params;
    const body = await parseJson(request);
    if (!body) throw new ApiError(400, "Invalid request body");
    const managerRating = parseRating(body.managerRating, "managerRating");

    const { db, pool } = await getDb();
    try {
      const { reviews, employees } = await import("@db/schema");
      const [existing] = await db
        .select()
        .from(reviews)
        .where(and(eq(reviews.id, id), eq(reviews.tenantId, user.tenantId)))
        .limit(1);
      if (!existing) throw new ApiError(404, "Review not found");

      const set: Partial<typeof reviews.$inferInsert> = {
        managerRating,
        strengths:
          body.strengths !== undefined
            ? asString(body.strengths).trim() || null
            : existing.strengths,
        growth:
          body.growth !== undefined
            ? asString(body.growth).trim() || null
            : existing.growth,
        status: "submitted",
      };
      if (existing.selfRating !== null && existing.selfRating !== undefined) {
        set.overall = round1((Number(existing.selfRating) + managerRating) / 2);
      } else {
        set.overall = managerRating;
      }

      const [updated] = await db
        .update(reviews)
        .set(set)
        .where(eq(reviews.id, id))
        .returning();

      const [employee] = await db
        .select()
        .from(employees)
        .where(
          and(
            eq(employees.tenantId, user.tenantId),
            eq(employees.id, existing.employeeId),
          ),
        )
        .limit(1);
      if (employee?.userId) {
        await notify({
          tenantId: user.tenantId,
          userId: employee.userId,
          type: "performance",
          title: "Manager review submitted",
          body: "Your manager review has been completed.",
          href: `/performance/${id}`,
        });
      }
      await addAudit({
        tenantId: user.tenantId,
        userId: user.id,
        actorName: user.name,
        action: "performance.review.manager",
        target: id,
        category: "performance",
      });
      return ok({
        ...updated,
        selfRating: toNumOrNull(updated.selfRating),
        managerRating: toNumOrNull(updated.managerRating),
        overall: toNumOrNull(updated.overall),
      });
    } finally {
      await pool.end();
    }
  },
);
