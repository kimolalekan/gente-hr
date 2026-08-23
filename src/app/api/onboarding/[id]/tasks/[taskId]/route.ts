import { and, eq } from "drizzle-orm";
import {
  ApiError,
  addAudit,
  asString,
  getDb,
  ok,
  parseJson,
  recordEmail,
  requireRole,
  route,
} from "@/lib/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TASK_STATUSES = ["pending", "in_progress", "completed"];

/** Mark an onboarding task pending / in progress / completed. */
export const PATCH = route(
  async (
    request: Request,
    { params }: { params: Promise<{ id: string; taskId: string }> },
  ) => {
    const user = await requireRole(["admin", "hr"]);
    const { id, taskId } = await params;
    if (id === "complete") throw new ApiError(404, "Not found");

    const { db, pool } = await getDb();
    try {
      const { onboardingTasks, onboardingPlans } = await import("@db/schema");
      const body = await parseJson(request);
      const status = asString(body?.status);
      if (!TASK_STATUSES.includes(status)) {
        throw new ApiError(422, "status must be pending, in_progress or completed");
      }

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

      const [task] = await db
        .update(onboardingTasks)
        .set({
          status,
          completedAt: status === "completed" ? new Date() : null,
        })
        .where(
          and(
            eq(onboardingTasks.id, taskId),
            eq(onboardingTasks.planId, id),
            eq(onboardingTasks.tenantId, user.tenantId),
          ),
        )
        .returning();
      if (!task) throw new ApiError(404, "Onboarding task not found");

      // When every task is done, complete the plan and notify the new hire.
      if (status === "completed" && plan.status !== "completed") {
        const tasks = await db
          .select({ status: onboardingTasks.status })
          .from(onboardingTasks)
          .where(
            and(
              eq(onboardingTasks.planId, id),
              eq(onboardingTasks.tenantId, user.tenantId),
            ),
          );
        if (tasks.length > 0 && tasks.every((t) => t.status === "completed")) {
          await db
            .update(onboardingPlans)
            .set({ status: "completed" })
            .where(
              and(
                eq(onboardingPlans.id, id),
                eq(onboardingPlans.tenantId, user.tenantId),
              ),
            );
          await recordEmail({
            tenantId: user.tenantId,
            to: plan.email,
            templateKey: "onboarding_done",
          });
        }
      }

      await addAudit({
        tenantId: user.tenantId,
        userId: user.id,
        actorName: user.name,
        action: "onboarding.task",
        target: taskId,
        category: "onboarding",
      });

      return ok(task);
    } finally {
      await pool.end();
    }
  },
);
