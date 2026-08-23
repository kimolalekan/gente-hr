import { and, eq } from "drizzle-orm";
import {
  ApiError,
  addAudit,
  asInt,
  getDb,
  notify,
  ok,
  parseJson,
  recordEmail,
  requireRole,
  route,
} from "@/lib/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

/** Extend a review deadline (admin, hr) — bumps the extension counter. */
export const PATCH = route(
  async (
    request: Request,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const user = await requireRole(["admin", "hr"]);
    const { id } = await params;
    const body = await parseJson(request);
    if (!body) throw new ApiError(400, "Invalid request body");
    const extraDays = asInt(body.extraDays);
    if (extraDays <= 0) {
      throw new ApiError(422, "extraDays must be a positive number");
    }

    const { db, pool } = await getDb();
    try {
      const { reviews, employees } = await import("@db/schema");
      const [existing] = await db
        .select()
        .from(reviews)
        .where(and(eq(reviews.id, id), eq(reviews.tenantId, user.tenantId)))
        .limit(1);
      if (!existing) throw new ApiError(404, "Review not found");

      const deadline = addDays(existing.deadline ?? today(), extraDays);
      const [updated] = await db
        .update(reviews)
        .set({
          deadline,
          deadlineExtended: (existing.deadlineExtended ?? 0) + 1,
        })
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
      if (employee) {
        await recordEmail({
          tenantId: user.tenantId,
          to: employee.email,
          templateKey: "review_deadline_extended",
        });
        if (employee.userId) {
          await notify({
            tenantId: user.tenantId,
            userId: employee.userId,
            type: "performance",
            title: "Review deadline extended",
            body: `Your review deadline was extended to ${deadline}.`,
            href: `/performance/${id}`,
          });
        }
      }
      await addAudit({
        tenantId: user.tenantId,
        userId: user.id,
        actorName: user.name,
        action: "performance.review.deadline_extended",
        target: id,
        category: "performance",
      });
      return ok(updated);
    } finally {
      await pool.end();
    }
  },
);
