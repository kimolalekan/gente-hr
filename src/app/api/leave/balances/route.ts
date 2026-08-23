import { and, desc, eq } from "drizzle-orm";
import {
  getDb,
  getEmployeeForUser,
  ok,
  requireUser,
  route,
} from "@/lib/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Leave balances per employee/year (admin/hr: all; member: own). */
export const GET = route(async () => {
  const user = await requireUser();
  const { db, pool } = await getDb();
  try {
    const { leaveBalances, employees } = await import("@db/schema");

    const conditions = [eq(leaveBalances.tenantId, user.tenantId)];
    if (user.role === "member") {
      const employee = await getEmployeeForUser(user.tenantId, user.id);
      if (!employee) return ok([]);
      conditions.push(eq(leaveBalances.employeeId, employee.id));
    }

    const rows = await db
      .select({
        employeeId: leaveBalances.employeeId,
        employeeName: employees.name,
        year: leaveBalances.year,
        vacationTotal: leaveBalances.vacationTotal,
        vacationUsed: leaveBalances.vacationUsed,
        sickTotal: leaveBalances.sickTotal,
        sickUsed: leaveBalances.sickUsed,
        personalTotal: leaveBalances.personalTotal,
        personalUsed: leaveBalances.personalUsed,
      })
      .from(leaveBalances)
      .leftJoin(employees, eq(leaveBalances.employeeId, employees.id))
      .where(and(...conditions))
      .orderBy(desc(leaveBalances.year));

    return ok(
      rows.map((row) => ({
        employeeId: row.employeeId,
        employeeName: row.employeeName ?? null,
        year: row.year,
        vacation: {
          total: row.vacationTotal,
          used: row.vacationUsed,
          remaining: row.vacationTotal - row.vacationUsed,
        },
        sick: {
          total: row.sickTotal,
          used: row.sickUsed,
          remaining: row.sickTotal - row.sickUsed,
        },
        personal: {
          total: row.personalTotal,
          used: row.personalUsed,
          remaining: row.personalTotal - row.personalUsed,
        },
      })),
    );
  } finally {
    await pool.end();
  }
});
