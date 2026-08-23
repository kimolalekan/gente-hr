import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import {
  ApiError,
  asString,
  getDb,
  ok,
  requireRole,
  route,
} from "@/lib/server/api";
import { parseRange } from "@/lib/report-dates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REPORT_META: Record<
  string,
  { title: string; description: string; metric: string }
> = {
  employees: {
    title: "Headcount by department",
    description: "Current headcount grouped by department.",
    metric: "employees",
  },
  leave: {
    title: "Leave overview",
    description: "Leave requests by status in the selected period.",
    metric: "leave requests",
  },
  attendance: {
    title: "Attendance",
    description: "Attendance records by status in the selected period.",
    metric: "attendance",
  },
  payroll: {
    title: "Payroll runs",
    description: "Recent payroll runs with totals.",
    metric: "payroll",
  },
};

type Row = Record<string, unknown>;

/** Report detail rows + summary (admin, hr). Defaults to the last 7 days. */
export const GET = route(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireRole(["admin", "hr"]);
    const { id } = await params;
    if (!(id in REPORT_META)) throw new ApiError(404, "Report not found");

    const url = new URL(request.url);
    const { from, to } = parseRange(
      asString(url.searchParams.get("from")),
      asString(url.searchParams.get("to")),
    );

    const { db, pool } = await getDb();
    try {
      const { employees, leaves, attendanceRecords, payrollRuns } =
        await import("@db/schema");

      let rows: Row[] = [];
      let summary: Record<string, unknown> = {};

      if (id === "employees") {
        const grouped = await db
          .select({
            department: employees.department,
            count: sql<number>`count(*)::int`,
          })
          .from(employees)
          .where(eq(employees.tenantId, user.tenantId))
          .groupBy(employees.department);
        rows = grouped.map((g) => ({
          department: g.department ?? "Unassigned",
          count: g.count,
        }));
        summary = { total: grouped.reduce((sum, g) => sum + g.count, 0) };
      } else if (id === "leave") {
        const grouped = await db
          .select({
            status: leaves.status,
            count: sql<number>`count(*)::int`,
          })
          .from(leaves)
          .where(
            and(
              eq(leaves.tenantId, user.tenantId),
              gte(leaves.startDate, from),
              lte(leaves.startDate, to),
            ),
          )
          .groupBy(leaves.status);
        rows = grouped.map((g) => ({ status: g.status, count: g.count }));
        summary = { total: grouped.reduce((sum, g) => sum + g.count, 0) };
      } else if (id === "attendance") {
        const grouped = await db
          .select({
            status: attendanceRecords.status,
            count: sql<number>`count(*)::int`,
          })
          .from(attendanceRecords)
          .where(
            and(
              eq(attendanceRecords.tenantId, user.tenantId),
              gte(attendanceRecords.date, from),
              lte(attendanceRecords.date, to),
            ),
          )
          .groupBy(attendanceRecords.status);
        rows = grouped.map((g) => ({ status: g.status, count: g.count }));
        summary = {
          total: grouped.reduce((sum, g) => sum + g.count, 0),
          from,
          to,
        };
      } else {
        const runs = await db
          .select({
            period: payrollRuns.period,
            total: payrollRuns.total,
            employees: payrollRuns.employees,
            status: payrollRuns.status,
            processedAt: payrollRuns.processedAt,
          })
          .from(payrollRuns)
          .where(
            and(
              eq(payrollRuns.tenantId, user.tenantId),
              gte(sql`${payrollRuns.processedAt}::date`, from),
              lte(sql`${payrollRuns.processedAt}::date`, to),
            ),
          )
          .orderBy(desc(payrollRuns.processedAt));
        rows = runs.map((r) => ({
          period: r.period,
          total: r.total,
          employees: r.employees,
          status: r.status,
          processedAt: r.processedAt.toISOString(),
        }));
        summary = { runs: runs.length, from, to };
      }

      return ok({ report: { id, ...REPORT_META[id] }, rows, summary });
    } finally {
      await pool.end();
    }
  },
);
