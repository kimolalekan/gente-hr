import { eq, sql } from "drizzle-orm";
import {
  ApiError,
  addAudit,
  asString,
  employeeIdPrefix,
  getDb,
  ok,
  parseJson,
  recordEmail,
  route,
  verifyToken,
  notify,
} from "@/lib/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** jsonb columns accept any JSON value; pass non-empty values through. */
function jsonOrNull(value: unknown): Record<string, unknown> | null {
  return value === undefined || value === null || value === ""
    ? null
    : (value as Record<string, unknown>);
}

/**
 * Load invite context for the emailed completion link. Public — no auth;
 * access is granted by the signed token.
 */
export const GET = route(async (request: Request) => {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) throw new ApiError(400, "Missing token");
  const payload = verifyToken(token);
  const planId = payload?.planId;
  if (!planId) throw new ApiError(400, "Invalid token");

  const { db, pool } = await getDb();
  try {
    const { onboardingPlans } = await import("@db/schema");
    const [plan] = await db
      .select()
      .from(onboardingPlans)
      .where(eq(onboardingPlans.id, planId))
      .limit(1);
    if (!plan) throw new ApiError(404, "Onboarding plan not found");

    return ok({
      planId: plan.id,
      fullName: plan.fullName,
      email: plan.email,
      status: plan.status,
      startDate: plan.startDate,
    });
  } finally {
    await pool.end();
  }
});

/**
 * Employee submits their details. Public — the request is authorized by the
 * signed token in the body. Creates the user + employee, seeds onboarding
 * tasks, and flips the plan to in_progress.
 */
export const PUT = route(async (request: Request) => {
  const body = await parseJson(request);
  const token = asString(body?.token);
  if (!token) throw new ApiError(400, "Missing token");
  const payload = verifyToken(token);
  const planId = payload?.planId;
  if (!planId) throw new ApiError(400, "Invalid token");

  const { db, pool } = await getDb();
  try {
    const {
      users,
      userTenants,
      tenants,
      employees,
      employeeDocuments,
      onboardingTasks,
      onboardingPlans,
    } = await import("@db/schema");

    const [plan] = await db
      .select()
      .from(onboardingPlans)
      .where(eq(onboardingPlans.id, planId))
      .limit(1);
    if (!plan) throw new ApiError(404, "Onboarding plan not found");
    if (plan.status === "completed") {
      throw new ApiError(409, "Onboarding already completed");
    }
    const tenantId = plan.tenantId;

    // (a) Find or create the users row for this email.
    const existingUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, plan.email))
      .limit(1);
    let userId: string;
    if (existingUsers[0]) {
      userId = existingUsers[0].id;
    } else {
      const createdUsers = await db
        .insert(users)
        .values({ email: plan.email, name: plan.fullName, status: "active" })
        .returning({ id: users.id });
      userId = createdUsers[0].id;
    }

    // (a2) Give the new hire a member membership so they can sign in.
    await db
      .insert(userTenants)
      .values({
        userId,
        tenantId,
        role: "member",
        status: "active",
        isPrimary: true,
      })
      .onConflictDoNothing({
        target: [userTenants.userId, userTenants.tenantId],
      });

    // (b) Create the employee record (prefix + zero-padded next count).
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(employees)
      .where(eq(employees.tenantId, tenantId));
    const prefix = employeeIdPrefix(
      (
        await db
          .select({ settings: tenants.settings })
          .from(tenants)
          .where(eq(tenants.id, tenantId))
          .limit(1)
      )[0]?.settings,
    );
    const employeeCode = `${prefix}-${String((count ?? 0) + 1).padStart(3, "0")}`;

    const [employee] = await db
      .insert(employees)
      .values({
        tenantId,
        userId,
        employeeId: employeeCode,
        name: plan.fullName,
        email: plan.email,
        phone: asString(body?.phone) || null,
        department: null,
        status: "pending",
        joinDate: plan.startDate,
        profilePhoto: asString(body?.passportPhoto) || null,
        address: {
          address: asString(body?.address) || null,
          state: asString(body?.state) || null,
          country: asString(body?.country) || null,
        },
        bankDetails: jsonOrNull(body?.bankDetails),
        governmentId: jsonOrNull(body?.governmentId),
        emergencyContact: jsonOrNull(body?.emergencyContact),
        pension: jsonOrNull(body?.pension),
        taxId: asString(body?.taxId) || null,
      })
      .returning();

    // (c) Signed offer letter → employee document.
    const signedOfferLetter = asString(body?.signedOfferLetter);
    if (signedOfferLetter) {
      await db.insert(employeeDocuments).values({
        tenantId,
        employeeId: employee.id,
        name: "Signed offer letter",
        category: "contract",
        status: "pending",
        fileUrl: signedOfferLetter,
      });
    }

    // (d) Default onboarding tasks for the new hire.
    const defaultTasks: Array<{ name: string; department: string }> = [
      { name: "HR induction", department: "HR" },
      { name: "Create email account", department: "IT" },
      { name: "Prepare workstation", department: "IT" },
      { name: "Payroll & benefits setup", department: "HR" },
    ];
    await db.insert(onboardingTasks).values(
      defaultTasks.map((task, index) => ({
        tenantId,
        planId: plan.id,
        employeeId: employee.id,
        name: task.name,
        department: task.department,
        status: "pending",
        dueDate: plan.targetDate,
        sortOrder: index + 1,
      })),
    );

    // (e) Link the plan to the employee and mark it in progress.
    await db
      .update(onboardingPlans)
      .set({
        employeeId: employee.id,
        phone: asString(body?.phone) || plan.phone,
        address: asString(body?.address) || plan.address,
        state: asString(body?.state) || plan.state,
        country: asString(body?.country) || plan.country,
        signedOfferLetter: signedOfferLetter || plan.signedOfferLetter,
        status: "in_progress",
      })
      .where(eq(onboardingPlans.id, plan.id));

    // (f) Welcome email + in-app notification.
    await recordEmail({ tenantId, to: plan.email, templateKey: "welcome" });
    await notify({
      tenantId,
      userId,
      type: "onboarding",
      title: "Welcome to the team!",
      body: "Your onboarding has started — complete your setup tasks to get going.",
      href: "/onboarding",
    });

    // (g) Audit (no session user on the public route).
    await addAudit({
      tenantId,
      actorName: plan.email,
      action: "onboarding.complete",
      target: plan.id,
      category: "onboarding",
    });

    return ok({ planId: plan.id, employeeId: employee.id });
  } finally {
    await pool.end();
  }
});
