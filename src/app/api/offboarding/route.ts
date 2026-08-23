import { and, desc, eq } from "drizzle-orm";
import {
  ApiError,
  addAudit,
  asDate,
  asString,
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

/** List exits with employee name and checklist progress. */
export const GET = route(async () => {
  const user = await requireRole(["admin", "hr"]);
  const { db, pool } = await getDb();
  try {
    const { offboardings, offboardingChecklistItems, employees } =
      await import("@db/schema");

    const list = await db
      .select()
      .from(offboardings)
      .where(eq(offboardings.tenantId, user.tenantId))
      .orderBy(desc(offboardings.createdAt));

    const employeeRows = await db
      .select({ id: employees.id, name: employees.name })
      .from(employees)
      .where(eq(employees.tenantId, user.tenantId));
    const names = new Map(employeeRows.map((e) => [e.id, e.name]));

    const rows = [];
    for (const offboarding of list) {
      const items = await db
        .select()
        .from(offboardingChecklistItems)
        .where(eq(offboardingChecklistItems.offboardingId, offboarding.id));
      rows.push({
        ...offboarding,
        employeeName: names.get(offboarding.employeeId) ?? null,
        checklistProgress: {
          done: items.filter((item) => item.done).length,
          total: items.length,
        },
      });
    }
    return ok(rows);
  } finally {
    await pool.end();
  }
});

/** Start an offboarding: record + checklist items + notify the employee. */
export const POST = route(async (request: Request) => {
  const user = await requireRole(["admin", "hr"]);
  const { db, pool } = await getDb();
  try {
    const { offboardings, offboardingChecklistItems, employees } =
      await import("@db/schema");
    const body = await parseJson(request);

    const employeeId = asString(body?.employeeId);
    const reason = asString(body?.reason);
    const lastWorkingDay = asDate(body?.lastWorkingDay);
    if (!employeeId) throw new ApiError(422, "employeeId is required");
    if (!reason) throw new ApiError(422, "reason is required");
    if (!lastWorkingDay) throw new ApiError(422, "Invalid lastWorkingDay");

    const [employee] = await db
      .select()
      .from(employees)
      .where(
        and(eq(employees.id, employeeId), eq(employees.tenantId, user.tenantId)),
      )
      .limit(1);
    if (!employee) throw new ApiError(404, "Employee not found");

    const checklistNames = Array.isArray(body?.checklistNames)
      ? body.checklistNames.filter(
          (name): name is string => typeof name === "string" && name.length > 0,
        )
      : [];

    const [offboarding] = await db
      .insert(offboardings)
      .values({
        tenantId: user.tenantId,
        employeeId,
        reason,
        lastWorkingDay,
        notes: asString(body?.notes) || null,
      })
      .returning();

    if (checklistNames.length > 0) {
      await db.insert(offboardingChecklistItems).values(
        checklistNames.map((name, index) => ({
          offboardingId: offboarding.id,
          name,
          done: false,
          sortOrder: index,
        })),
      );
    }

    await recordEmail({
      tenantId: user.tenantId,
      to: employee.email,
      templateKey: "offboarding_started",
    });
    if (employee.userId) {
      await notify({
        tenantId: user.tenantId,
        userId: employee.userId,
        type: "offboarding",
        title: "Offboarding started",
        body: `Your offboarding process has started (${reason}).`,
        href: "/offboarding",
      });
    }
    await addAudit({
      tenantId: user.tenantId,
      userId: user.id,
      actorName: user.name,
      action: "offboarding.start",
      target: offboarding.id,
      category: "offboarding",
    });

    return ok(offboarding, { status: 201 });
  } finally {
    await pool.end();
  }
});
