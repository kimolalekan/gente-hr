import { and, desc, eq } from "drizzle-orm";
import {
  ApiError,
  addAudit,
  asDate,
  asInt,
  asString,
  getDb,
  ok,
  parseJson,
  requireRole,
  route,
} from "@/lib/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Salary records with employee names (admin, hr). */
export const GET = route(async () => {
  const user = await requireRole(["admin", "hr"]);
  const { db, pool } = await getDb();
  try {
    const { salary, employees } = await import("@db/schema");
    const rows = await db
      .select({
        id: salary.id,
        employeeId: salary.employeeId,
        employeeName: employees.name,
        employeeEmail: employees.email,
        department: employees.department,
        basic: salary.basic,
        hra: salary.hra,
        allowances: salary.allowances,
        bonus: salary.bonus,
        tax: salary.tax,
        pension: salary.pension,
        insurance: salary.insurance,
        gross: salary.gross,
        currency: salary.currency,
        effectiveFrom: salary.effectiveFrom,
        createdAt: salary.createdAt,
      })
      .from(salary)
      .leftJoin(employees, eq(salary.employeeId, employees.id))
      .where(eq(salary.tenantId, user.tenantId))
      .orderBy(desc(salary.effectiveFrom));
    return ok(rows);
  } finally {
    await pool.end();
  }
});

/** Set/update an employee's salary (admin, hr) — upsert on the latest row. */
export const POST = route(async (request: Request) => {
  const user = await requireRole(["admin", "hr"]);
  const body = await parseJson(request);
  if (!body) throw new ApiError(400, "Invalid request body");

  const employeeId = asString(body.employeeId);
  if (!employeeId) throw new ApiError(422, "employeeId is required");
  const effectiveFrom = asDate(body.effectiveFrom);
  if (!effectiveFrom) throw new ApiError(422, "effectiveFrom is required (YYYY-MM-DD)");

  const basic = asInt(body.basic);
  const hra = asInt(body.hra);
  const allowances = asInt(body.allowances);
  const bonus = asInt(body.bonus);
  const tax = asInt(body.tax);
  const pension = asInt(body.pension);
  const insurance = asInt(body.insurance);
  const currency = asString(body.currency).trim() || "USD";
  const gross = basic + hra + allowances + bonus;

  const { db, pool } = await getDb();
  try {
    const { salary, employees } = await import("@db/schema");
    const [employee] = await db
      .select({ id: employees.id })
      .from(employees)
      .where(
        and(eq(employees.tenantId, user.tenantId), eq(employees.id, employeeId)),
      )
      .limit(1);
    if (!employee) throw new ApiError(422, "Employee not found");

    const [latest] = await db
      .select()
      .from(salary)
      .where(
        and(eq(salary.tenantId, user.tenantId), eq(salary.employeeId, employeeId)),
      )
      .orderBy(desc(salary.effectiveFrom), desc(salary.createdAt))
      .limit(1);

    const values = {
      basic,
      hra,
      allowances,
      bonus,
      tax,
      pension,
      insurance,
      gross,
      currency,
      effectiveFrom,
    };

    let row: typeof salary.$inferSelect;
    if (latest) {
      [row] = await db
        .update(salary)
        .set(values)
        .where(eq(salary.id, latest.id))
        .returning();
    } else {
      [row] = await db
        .insert(salary)
        .values({ tenantId: user.tenantId, employeeId, ...values })
        .returning();
    }

    await addAudit({
      tenantId: user.tenantId,
      userId: user.id,
      actorName: user.name,
      action: "payroll.salary.upsert",
      target: employeeId,
      category: "payroll",
    });
    return ok(row, { status: latest ? 200 : 201 });
  } finally {
    await pool.end();
  }
});
