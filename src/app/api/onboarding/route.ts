import { and, desc, eq } from "drizzle-orm";
import {
  ApiError,
  addAudit,
  asDate,
  asInt,
  asString,
  getDb,
  ok,
  paginate,
  parseJson,
  recordEmail,
  requireRole,
  route,
  signToken,
} from "@/lib/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

/** List onboarding plans (newest first) with their task counts. */
export const GET = route(async (request: Request) => {
  const user = await requireRole(["admin", "hr"]);
  const { db, pool } = await getDb();
  try {
    const { onboardingPlans, onboardingTasks } = await import("@db/schema");
    const url = new URL(request.url);
    const status = asString(url.searchParams.get("status"));
    const page = asInt(url.searchParams.get("page"), 1);
    const pageSize = asInt(url.searchParams.get("pageSize"), 20);

    const conditions = [eq(onboardingPlans.tenantId, user.tenantId)];
    if (status) conditions.push(eq(onboardingPlans.status, status));

    const plans = await db
      .select()
      .from(onboardingPlans)
      .where(and(...conditions))
      .orderBy(desc(onboardingPlans.createdAt));

    const taskRows = await db
      .select({ planId: onboardingTasks.planId })
      .from(onboardingTasks)
      .where(eq(onboardingTasks.tenantId, user.tenantId));
    const taskCounts = new Map<string, number>();
    for (const task of taskRows) {
      taskCounts.set(task.planId, (taskCounts.get(task.planId) ?? 0) + 1);
    }

    const rows = plans.map((plan) => ({
      ...plan,
      taskCount: taskCounts.get(plan.id) ?? 0,
    }));
    return ok(paginate(rows, page, pageSize));
  } finally {
    await pool.end();
  }
});

/** Invite a new hire: create the plan and email the completion link. */
export const POST = route(async (request: Request) => {
  const user = await requireRole(["admin", "hr"]);
  const { db, pool } = await getDb();
  try {
    const { onboardingPlans } = await import("@db/schema");
    const body = await parseJson(request);

    const fullName = asString(body?.fullName).trim();
    const email = asString(body?.email).trim();
    if (!fullName || !email) {
      throw new ApiError(422, "fullName and email are required");
    }

    const startDate = asDate(body?.startDate || todayStr());
    const targetDate = asDate(body?.targetDate || addDays(todayStr(), 14));
    if (!startDate || !targetDate) {
      throw new ApiError(422, "Invalid startDate or targetDate");
    }

    const [plan] = await db
      .insert(onboardingPlans)
      .values({
        tenantId: user.tenantId,
        fullName,
        email,
        phone: asString(body?.phone) || null,
        startDate,
        targetDate,
        status: "invited",
      })
      .returning();

    const origin = new URL(request.url).origin;
    const token = signToken({ planId: plan.id, email });
    const inviteLink = `${origin}/onboarding/complete?token=${encodeURIComponent(token)}`;

    await recordEmail({ tenantId: user.tenantId, to: email, templateKey: "onboarding_invite" });
    await addAudit({
      tenantId: user.tenantId,
      userId: user.id,
      actorName: user.name,
      action: "onboarding.invite",
      target: plan.id,
      category: "onboarding",
    });

    return ok({ ...plan, inviteLink }, { status: 201 });
  } finally {
    await pool.end();
  }
});
