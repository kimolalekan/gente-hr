import { and, asc, eq } from "drizzle-orm";
import {
  ApiError,
  addAudit,
  asDate,
  asString,
  getDb,
  ok,
  parseJson,
  requireRole,
  route,
} from "@/lib/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PLAN_STATUSES = ["invited", "in_progress", "completed", "cancelled"];

/** Plan detail with its onboarding tasks. */
export const GET = route(
  async (
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const user = await requireRole(["admin", "hr"]);
    const { id } = await params;
    // "complete" is a static public route; never treat it as a plan id.
    if (id === "complete") throw new ApiError(404, "Not found");

    const { db, pool } = await getDb();
    try {
      const { onboardingPlans, onboardingTasks } = await import("@db/schema");
      const [plan] = await db
        .select()
        .from(onboardingPlans)
        .where(
          and(
            eq(onboardingPlans.id, id),
            eq(onboardingPlans.tenantId, user.tenantId),
          ),
        )
        .limit(1);
      if (!plan) throw new ApiError(404, "Onboarding plan not found");

      const tasks = await db
        .select()
        .from(onboardingTasks)
        .where(
          and(
            eq(onboardingTasks.planId, id),
            eq(onboardingTasks.tenantId, user.tenantId),
          ),
        )
        .orderBy(asc(onboardingTasks.sortOrder));

      return ok({ ...plan, tasks });
    } finally {
      await pool.end();
    }
  },
);

/** Edit invite details / cancel invite. */
export const PATCH = route(
  async (
    request: Request,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const user = await requireRole(["admin", "hr"]);
    const { id } = await params;
    if (id === "complete") throw new ApiError(404, "Not found");

    const { db, pool } = await getDb();
    try {
      const { onboardingPlans } = await import("@db/schema");
      const body = await parseJson(request);

      const set: Partial<typeof onboardingPlans.$inferInsert> = {};
      if (body?.fullName !== undefined) set.fullName = asString(body.fullName);
      if (body?.email !== undefined) set.email = asString(body.email);
      if (body?.phone !== undefined) set.phone = asString(body.phone) || null;
      if (body?.address !== undefined) {
        set.address = asString(body.address) || null;
      }
      if (body?.state !== undefined) set.state = asString(body.state) || null;
      if (body?.country !== undefined) {
        set.country = asString(body.country) || null;
      }
      if (body?.startDate !== undefined) {
        const d = asDate(body.startDate);
        if (!d) throw new ApiError(422, "Invalid startDate");
        set.startDate = d;
      }
      if (body?.targetDate !== undefined) {
        const d = asDate(body.targetDate);
        if (!d) throw new ApiError(422, "Invalid targetDate");
        set.targetDate = d;
      }
      if (body?.status !== undefined) {
        const s = asString(body.status);
        if (!PLAN_STATUSES.includes(s)) throw new ApiError(422, "Invalid status");
        set.status = s;
      }
      if (Object.keys(set).length === 0) {
        throw new ApiError(422, "No fields to update");
      }

      const [plan] = await db
        .update(onboardingPlans)
        .set(set)
        .where(
          and(
            eq(onboardingPlans.id, id),
            eq(onboardingPlans.tenantId, user.tenantId),
          ),
        )
        .returning();
      if (!plan) throw new ApiError(404, "Onboarding plan not found");

      await addAudit({
        tenantId: user.tenantId,
        userId: user.id,
        actorName: user.name,
        action: "onboarding.update",
        target: plan.id,
        category: "onboarding",
      });

      return ok(plan);
    } finally {
      await pool.end();
    }
  },
);
