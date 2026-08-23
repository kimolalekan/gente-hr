import { and, desc, eq } from "drizzle-orm";
import {
  ApiError,
  getDb,
  getEmployeeForUser,
  ok,
  requireUser,
  route,
} from "@/lib/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/employees/me — the current user's own employee record, in the same
 * shape as the employees list (`role` = designation, `salary` = latest gross).
 * Used by member self-service pages (profile, dashboard, payroll, leave…).
 */
export const GET = route(async () => {
  const user = await requireUser();
  const own = await getEmployeeForUser(user.tenantId, user.id);
  if (!own)
    throw new ApiError(404, "No employee record linked to your account");

  const { db, pool } = await getDb();
  const { employees, salary } = await import("@db/schema");
  try {
    const [row] = await db
      .select()
      .from(employees)
      .where(
        and(eq(employees.id, own.id), eq(employees.tenantId, user.tenantId)),
      )
      .limit(1);
    if (!row) throw new ApiError(404, "Employee not found");

    const managerName = row.managerId
      ? ((
          await db
            .select({ name: employees.name })
            .from(employees)
            .where(eq(employees.id, row.managerId))
            .limit(1)
        )[0]?.name ?? null)
      : null;

    const [latestSalary] = await db
      .select({ gross: salary.gross })
      .from(salary)
      .where(
        and(eq(salary.tenantId, user.tenantId), eq(salary.employeeId, row.id)),
      )
      .orderBy(desc(salary.effectiveFrom))
      .limit(1);

    return ok({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      role: row.designation,
      department: row.department,
      address: row.address,
      status: row.status,
      joinedAt: row.joinDate,
      employmentType: row.employmentType,
      employeeId: row.employeeId,
      manager: managerName,
      salary: latestSalary?.gross ?? 0,
    });
  } finally {
    await pool.end();
  }
});
