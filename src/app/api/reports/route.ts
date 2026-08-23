import { and, desc, eq, sql } from "drizzle-orm";
import { getDb, ok, requireRole, route } from "@/lib/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Report catalog + summary metrics (admin, hr). */
export const GET = route(async () => {
  const user = await requireRole(["admin", "hr"]);
  const { db, pool } = await getDb();
  try {
    const { employees, leaves, payrollRuns } = await import("@db/schema");

    const [employeeCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(employees)
      .where(
        and(
          eq(employees.tenantId, user.tenantId),
          eq(employees.status, "active"),
        ),
      );

    const [onLeaveToday] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(leaves)
      .where(
        and(
          eq(leaves.tenantId, user.tenantId),
          eq(leaves.status, "approved"),
          sql`${leaves.startDate} <= ${today()}`,
          sql`${leaves.endDate} >= ${today()}`,
        ),
      );

    const [pendingLeave] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(leaves)
      .where(
        and(eq(leaves.tenantId, user.tenantId), eq(leaves.status, "pending")),
      );

    const [latestRun] = await db
      .select({ total: payrollRuns.total })
      .from(payrollRuns)
      .where(eq(payrollRuns.tenantId, user.tenantId))
      .orderBy(desc(payrollRuns.processedAt))
      .limit(1);

    const departmentRows = await db
      .select({ department: employees.department })
      .from(employees)
      .where(eq(employees.tenantId, user.tenantId));
    const departmentCount = new Set(
      departmentRows.map((r) => r.department).filter(Boolean),
    ).size;

    const reports = [
      {
        id: "employees",
        title: "Headcount by department",
        description: "Current headcount grouped by department.",
        metric: `${employeeCount?.count ?? 0} employees`,
      },
      {
        id: "leave",
        title: "Leave overview",
        description: "Leave requests by status in the selected period.",
        metric: `${pendingLeave?.count ?? 0} pending`,
      },
      {
        id: "attendance",
        title: "Attendance",
        description: "Attendance records by status in the selected period.",
        metric: "Week",
      },
      {
        id: "payroll",
        title: "Payroll runs",
        description: "Recent payroll runs with totals.",
        metric: latestRun ? `${latestRun.total}` : "0",
      },
    ];

    return ok({
      reports,
      metrics: {
        employees: employeeCount?.count ?? 0,
        onLeaveToday: onLeaveToday?.count ?? 0,
        pendingLeave: pendingLeave?.count ?? 0,
        payrollTotal: latestRun?.total ?? 0,
        departments: departmentCount,
      },
    });
  } finally {
    await pool.end();
  }
});
