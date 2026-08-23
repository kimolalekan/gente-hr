import { and, desc, eq, sql } from "drizzle-orm";
import {
  ApiError,
  addAudit,
  asDate,
  asInt,
  asString,
  getDb,
  getEmployeeForUser,
  notify,
  ok,
  paginate,
  parseJson,
  recordEmail,
  requireRole,
  requireUser,
  route,
  toNumOrNull,
} from "@/lib/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** List reviews (admin, hr: all; member: own) with cycle/template/status filters. */
export const GET = route(async (request: Request) => {
  const user = await requireUser();
  const { db, pool } = await getDb();
  try {
    const { reviews, employees, reviewCycles } = await import("@db/schema");
    const url = new URL(request.url);
    const cycleId = asString(url.searchParams.get("cycleId"));
    const templateId = asString(url.searchParams.get("templateId"));
    const status = asString(url.searchParams.get("status"));
    const page = asInt(url.searchParams.get("page"), 1);
    const pageSize = asInt(url.searchParams.get("pageSize"), 20);

    const conditions = [eq(reviews.tenantId, user.tenantId)];
    if (user.role === "member") {
      const employee = await getEmployeeForUser(user.tenantId, user.id);
      if (!employee) return ok(paginate([], page, pageSize));
      conditions.push(eq(reviews.employeeId, employee.id));
    } else {
      if (cycleId) conditions.push(eq(reviews.cycleId, cycleId));
      if (templateId) conditions.push(eq(reviews.templateId, templateId));
      if (status) conditions.push(eq(reviews.status, status));
    }

    const rows = await db
      .select({
        id: reviews.id,
        cycleId: reviews.cycleId,
        cycleName: reviewCycles.name,
        employeeId: reviews.employeeId,
        employeeName: employees.name,
        reviewerName: reviews.reviewerName,
        templateId: reviews.templateId,
        deadline: reviews.deadline,
        deadlineExtended: reviews.deadlineExtended,
        selfRating: reviews.selfRating,
        managerRating: reviews.managerRating,
        overall: reviews.overall,
        status: reviews.status,
        submittedAt: reviews.submittedAt,
        createdAt: reviews.createdAt,
      })
      .from(reviews)
      .leftJoin(employees, eq(reviews.employeeId, employees.id))
      .leftJoin(reviewCycles, eq(reviews.cycleId, reviewCycles.id))
      .where(and(...conditions))
      .orderBy(desc(reviews.createdAt));

    return ok(
      paginate(
        rows.map((row) => ({
          ...row,
          selfRating: toNumOrNull(row.selfRating),
          managerRating: toNumOrNull(row.managerRating),
          overall: toNumOrNull(row.overall),
        })),
        page,
        pageSize,
      ),
    );
  } finally {
    await pool.end();
  }
});

/**
 * Start a review (admin, hr): reuse the open cycle (or create an annual one),
 * create a draft review and email/notify the employee.
 */
export const POST = route(async (request: Request) => {
  const user = await requireRole(["admin", "hr"]);
  const body = await parseJson(request);
  if (!body) throw new ApiError(400, "Invalid request body");

  const templateId = asString(body.templateId);
  const employeeId = asString(body.employeeId);
  if (!templateId || !employeeId) {
    throw new ApiError(422, "templateId and employeeId are required");
  }
  const deadline = asDate(body.deadline);

  const { db, pool } = await getDb();
  try {
    const { reviews, reviewCycles, performanceTemplates, employees } =
      await import("@db/schema");

    const [template] = await db
      .select({ id: performanceTemplates.id })
      .from(performanceTemplates)
      .where(
        and(
          eq(performanceTemplates.tenantId, user.tenantId),
          sql`${performanceTemplates.id}::text = ${templateId}`,
        ),
      )
      .limit(1);
    if (!template) throw new ApiError(422, "Template not found");

    const [employee] = await db
      .select()
      .from(employees)
      .where(
        and(
          eq(employees.tenantId, user.tenantId),
          eq(employees.id, employeeId),
        ),
      )
      .limit(1);
    if (!employee) throw new ApiError(422, "Employee not found");

    // Reuse an open cycle, or create the annual one for the current year.
    let [cycle] = await db
      .select()
      .from(reviewCycles)
      .where(
        and(
          eq(reviewCycles.tenantId, user.tenantId),
          eq(reviewCycles.status, "open"),
        ),
      )
      .limit(1);
    if (!cycle) {
      [cycle] = await db
        .insert(reviewCycles)
        .values({
          tenantId: user.tenantId,
          name: `Review ${new Date().getFullYear()}`,
          period: "annual",
          status: "open",
        })
        .returning();
    }

    const [review] = await db
      .insert(reviews)
      .values({
        tenantId: user.tenantId,
        cycleId: cycle.id,
        employeeId,
        reviewerId: user.id,
        reviewerName: user.name,
        templateId,
        deadline,
        status: "draft",
      })
      .returning();

    await recordEmail({
      tenantId: user.tenantId,
      to: employee.email,
      templateKey: "review_started",
    });
    if (employee.userId) {
      await notify({
        tenantId: user.tenantId,
        userId: employee.userId,
        type: "performance",
        title: "Performance review started",
        body: "A performance review has been started for you.",
        href: `/performance/${review.id}`,
      });
    }
    await addAudit({
      tenantId: user.tenantId,
      userId: user.id,
      actorName: user.name,
      action: "performance.review_start",
      target: review.id,
      category: "performance",
    });
    return ok(
      {
        ...review,
        selfRating: toNumOrNull(review.selfRating),
        managerRating: toNumOrNull(review.managerRating),
        overall: toNumOrNull(review.overall),
      },
      { status: 201 },
    );
  } finally {
    await pool.end();
  }
});
