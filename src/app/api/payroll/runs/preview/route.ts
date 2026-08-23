import { and, desc, eq, or } from "drizzle-orm";
import { asString, getDb, ok, requireRole, route } from "@/lib/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function currentPeriod(): string {
  const d = new Date();
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Compute payroll totals for a period without persisting (admin, hr). */
export const GET = route(async (request: Request) => {
  const user = await requireRole(["admin", "hr"]);
  const url = new URL(request.url);
  const period =
    asString(url.searchParams.get("period")).trim() || currentPeriod();

  const { db, pool } = await getDb();
  try {
    const { employees, salary, loans } = await import("@db/schema");

    const salaryRows = await db
      .select()
      .from(salary)
      .where(eq(salary.tenantId, user.tenantId))
      .orderBy(desc(salary.effectiveFrom), desc(salary.createdAt));
    const latestSalary = new Map<string, typeof salary.$inferSelect>();
    for (const row of salaryRows) {
      if (!latestSalary.has(row.employeeId))
        latestSalary.set(row.employeeId, row);
    }

    const activeEmployees = await db
      .select()
      .from(employees)
      .where(
        and(
          eq(employees.tenantId, user.tenantId),
          eq(employees.status, "active"),
        ),
      );
    const employeeById = new Map(activeEmployees.map((e) => [e.id, e]));

    const loanRows = await db
      .select()
      .from(loans)
      .where(
        and(
          eq(loans.tenantId, user.tenantId),
          or(eq(loans.status, "active"), eq(loans.status, "approved")),
        ),
      );
    const loanEmiByEmployee = new Map<string, number>();
    for (const loan of loanRows) {
      loanEmiByEmployee.set(
        loan.employeeId,
        (loanEmiByEmployee.get(loan.employeeId) ?? 0) + (loan.monthlyEmi ?? 0),
      );
    }

    const computed: Array<{
      employeeId: string;
      gross: number;
      deductions: number;
      net: number;
    }> = [];
    for (const emp of activeEmployees) {
      const sal = latestSalary.get(emp.id);
      if (!sal) continue;
      const grossMonthly = Math.round(sal.gross / 12);
      const loanEmi = loanEmiByEmployee.get(emp.id) ?? 0;
      const deductions =
        Math.round(sal.tax / 12) +
        Math.round(sal.pension / 12) +
        Math.round(sal.insurance / 12) +
        loanEmi;
      computed.push({
        employeeId: emp.id,
        gross: grossMonthly,
        deductions,
        net: grossMonthly - deductions,
      });
    }

    const byDepartmentMap = new Map<
      string,
      { department: string; employees: number; gross: number; net: number }
    >();
    for (const e of computed) {
      const emp = employeeById.get(e.employeeId);
      const key = emp?.department ?? "Unassigned";
      const bucket = byDepartmentMap.get(key) ?? {
        department: key,
        employees: 0,
        gross: 0,
        net: 0,
      };
      bucket.employees += 1;
      bucket.gross += e.gross;
      bucket.net += e.net;
      byDepartmentMap.set(key, bucket);
    }

    return ok({
      period,
      employees: computed.length,
      totalGross: computed.reduce((sum, e) => sum + e.gross, 0),
      totalDeductions: computed.reduce((sum, e) => sum + e.deductions, 0),
      totalNet: computed.reduce((sum, e) => sum + e.net, 0),
      byDepartment: [...byDepartmentMap.values()],
    });
  } finally {
    await pool.end();
  }
});
