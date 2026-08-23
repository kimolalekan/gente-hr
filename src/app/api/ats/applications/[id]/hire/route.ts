import { and, desc, eq } from "drizzle-orm";
import {
  ApiError,
  addAudit,
  asDate,
  asString,
  employeeIdPrefix,
  getDb,
  ok,
  parseJson,
  requireRole,
  route,
} from "@/lib/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-fA-F-]{8,}$/;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * POST /api/ats/applications/[id]/hire — mark hired and hand off to onboarding:
 * creates the employee record and an onboarding plan from the candidate's
 * details (Agent.md §2 → §3).
 */
export const POST = route(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireRole(["admin", "hr"]);
    const { id } = await params;
    if (!UUID_RE.test(id)) throw new ApiError(404, "Not found");
    const body = await parseJson(request);
    if (!body) throw new ApiError(400, "Invalid request body");

    const { db, pool } = await getDb();
    const {
      applications,
      applicationStages,
      employees,
      offers,
      onboardingPlans,
      tenants,
    } = await import("@db/schema");
    try {
      const [app] = await db
        .select()
        .from(applications)
        .where(
          and(
            eq(applications.id, id),
            eq(applications.tenantId, user.tenantId),
          ),
        )
        .limit(1);
      if (!app) throw new ApiError(404, "Application not found");
      if (app.stage === "hired" || app.stage === "rejected") {
        throw new ApiError(409, `Application is already ${app.stage}`);
      }

      // The employee email must be unique within the tenant.
      const dup = await db
        .select({ id: employees.id })
        .from(employees)
        .where(
          and(
            eq(employees.tenantId, user.tenantId),
            eq(employees.email, app.email),
          ),
        )
        .limit(1);
      if (dup[0]) {
        throw new ApiError(
          409,
          "An employee with this email already exists in the organization",
        );
      }

      // Latest offer (if any) supplies the start date.
      const [offer] = await db
        .select({ startDate: offers.startDate })
        .from(offers)
        .where(
          and(eq(offers.tenantId, user.tenantId), eq(offers.applicationId, id)),
        )
        .orderBy(desc(offers.createdAt))
        .limit(1);

      const startDate = asDate(body.startDate) ?? offer?.startDate ?? today();
      const count = await db
        .select({ id: employees.id })
        .from(employees)
        .where(eq(employees.tenantId, user.tenantId));
      const prefix = employeeIdPrefix(
        (
          await db
            .select({ settings: tenants.settings })
            .from(tenants)
            .where(eq(tenants.id, user.tenantId))
            .limit(1)
        )[0]?.settings,
      );
      const employeeId = `${prefix}-${String(count.length + 1).padStart(3, "0")}`;

      const [employee] = await db
        .insert(employees)
        .values({
          tenantId: user.tenantId,
          employeeId,
          name: app.name,
          email: app.email,
          phone: app.phone,
          joinDate: startDate,
          employmentType: "full_time",
          status: "active",
        })
        .returning();

      await db
        .update(applications)
        .set({ stage: "hired", employeeId: employee.id, updatedAt: new Date() })
        .where(eq(applications.id, id));

      await db.insert(applicationStages).values({
        tenantId: user.tenantId,
        applicationId: id,
        fromStage: app.stage,
        toStage: "hired",
        note: asString(body.note).trim() || "Hired — handed off to onboarding",
        actorName: user.name,
      });

      // Hand off to onboarding: the new hire completes their profile via the
      // invite link (same flow as §3).
      const [plan] = await db
        .insert(onboardingPlans)
        .values({
          tenantId: user.tenantId,
          employeeId: employee.id,
          fullName: app.name,
          email: app.email,
          phone: app.phone,
          startDate,
          targetDate: addDays(startDate, 14),
          status: "invited",
        })
        .returning();

      await addAudit({
        tenantId: user.tenantId,
        userId: user.id,
        actorName: user.name,
        action: "ats.hire",
        target: app.name,
        category: "employee",
      });

      return ok({
        applicationId: id,
        stage: "hired",
        employee: { id: employee.id, employeeId, name: employee.name },
        onboardingPlan: { id: plan.id },
      });
    } finally {
      await pool.end();
    }
  },
);
