import { and, eq, sql } from "drizzle-orm";
import {
  ApiError,
  asString,
  getDb,
  getEmployeeForUser,
  notify,
  ok,
  parseJson,
  recordEmail,
  requireUser,
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

/** Review detail (admin, hr; member: own) incl. template sections + names. */
export const GET = route(
  async (
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const user = await requireUser();
    const { id } = await params;

    const { db, pool } = await getDb();
    try {
      const { reviews, employees, reviewCycles, performanceTemplates } =
        await import("@db/schema");
      const [review] = await db
        .select({
          id: reviews.id,
          cycleId: reviews.cycleId,
          cycleName: reviewCycles.name,
          employeeId: reviews.employeeId,
          employeeName: employees.name,
          employeeEmail: employees.email,
          reviewerId: reviews.reviewerId,
          reviewerName: reviews.reviewerName,
          templateId: reviews.templateId,
          deadline: reviews.deadline,
          deadlineExtended: reviews.deadlineExtended,
          selfRating: reviews.selfRating,
          managerRating: reviews.managerRating,
          overall: reviews.overall,
          status: reviews.status,
          strengths: reviews.strengths,
          growth: reviews.growth,
          submittedAt: reviews.submittedAt,
          createdAt: reviews.createdAt,
        })
        .from(reviews)
        .leftJoin(employees, eq(reviews.employeeId, employees.id))
        .leftJoin(reviewCycles, eq(reviews.cycleId, reviewCycles.id))
        .where(and(eq(reviews.id, id), eq(reviews.tenantId, user.tenantId)))
        .limit(1);
      if (!review) throw new ApiError(404, "Review not found");

      if (user.role === "member") {
        const employee = await getEmployeeForUser(user.tenantId, user.id);
        if (!employee || employee.id !== review.employeeId) {
          throw new ApiError(403, "You can't view this review");
        }
      }

      let template = null;
      if (review.templateId) {
        const templates = await db
          .select()
          .from(performanceTemplates)
          .where(
            and(
              eq(performanceTemplates.tenantId, user.tenantId),
              sql`${performanceTemplates.id}::text = ${review.templateId}`,
            ),
          )
          .limit(1);
        template = templates[0] ?? null;
      }
      return ok({
        ...review,
        selfRating: toNumOrNull(review.selfRating),
        managerRating: toNumOrNull(review.managerRating),
        overall: toNumOrNull(review.overall),
        template,
      });
    } finally {
      await pool.end();
    }
  },
);

/** Submit the self-review (member, own review only). */
export const PATCH = route(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireUser();
    if (user.role !== "member") {
      throw new ApiError(403, "Only the employee can submit their self-review");
    }
    const { id } = await params;
    const body = await parseJson(request);
    if (!body) throw new ApiError(400, "Invalid request body");
    const selfRating = parseRating(body.selfRating, "selfRating");

    const { db, pool } = await getDb();
    try {
      const { reviews, users } = await import("@db/schema");
      const employee = await getEmployeeForUser(user.tenantId, user.id);
      if (!employee) {
        throw new ApiError(403, "No employee profile linked to your account");
      }

      const [existing] = await db
        .select()
        .from(reviews)
        .where(and(eq(reviews.id, id), eq(reviews.tenantId, user.tenantId)))
        .limit(1);
      if (!existing) throw new ApiError(404, "Review not found");
      if (existing.employeeId !== employee.id) {
        throw new ApiError(403, "You can't submit this review");
      }
      if (existing.status === "submitted") {
        throw new ApiError(409, "Review already submitted");
      }

      const set: Partial<typeof reviews.$inferInsert> = {
        selfRating,
        strengths:
          body.strengths !== undefined
            ? asString(body.strengths).trim() || null
            : existing.strengths,
        growth:
          body.growth !== undefined
            ? asString(body.growth).trim() || null
            : existing.growth,
        status: "submitted",
        submittedAt: new Date(),
      };
      if (
        existing.managerRating !== null &&
        existing.managerRating !== undefined
      ) {
        set.overall = round1((selfRating + Number(existing.managerRating)) / 2);
      }

      const [updated] = await db
        .update(reviews)
        .set(set)
        .where(eq(reviews.id, id))
        .returning();

      // Notify + email the reviewer that the self-review is in.
      if (existing.reviewerId) {
        const [reviewer] = await db
          .select()
          .from(users)
          .where(eq(users.id, existing.reviewerId))
          .limit(1);
        if (reviewer) {
          await recordEmail({
            tenantId: user.tenantId,
            to: reviewer.email,
            templateKey: "review_submitted",
          });
          await notify({
            tenantId: user.tenantId,
            userId: reviewer.id,
            type: "performance",
            title: "Self-review submitted",
            body: `${employee.name} submitted their self-review.`,
            href: `/performance/${id}`,
          });
        }
      }
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
