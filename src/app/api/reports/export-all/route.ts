import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import {
  ApiError,
  asString,
  getDb,
  requireRole,
  route,
} from "@/lib/server/api";
import { parseRange } from "@/lib/report-dates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;

function rowsToCsv(rows: Row[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escapeCsv = (value: unknown) => {
    const s = value === null || value === undefined ? "" : String(value);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => escapeCsv(row[header])).join(","));
  }
  return lines.join("\n");
}

/** Combined workforce CSV export (admin, hr) — sections separated by blank lines. */
export const GET = route(async (request: Request) => {
  const user = await requireRole(["admin", "hr"]);
  const url = new URL(request.url);
  const format = asString(url.searchParams.get("format")) || "csv";
  if (format === "pdf") throw new ApiError(400, "PDF export not supported");
  if (format !== "csv") throw new ApiError(400, "Unsupported export format");
  const { from, to } = parseRange(
    asString(url.searchParams.get("from")),
    asString(url.searchParams.get("to")),
  );

  const { db, pool } = await getDb();
  try {
    const { employees, departments, leaves, attendanceRecords, payrollRuns } =
      await import("@db/schema");

    const employeeRows = await db
      .select({
        name: employees.name,
        email: employees.email,
        department: employees.department,
        designation: employees.designation,
        status: employees.status,
      })
      .from(employees)
      .where(eq(employees.tenantId, user.tenantId))
      .orderBy(asc(employees.name));

    const departmentRows = (
      await db
        .select({
          department: departments.name,
          count: sql<number>`count(*)::int`,
        })
        .from(departments)
        .where(eq(departments.tenantId, user.tenantId))
        .groupBy(departments.name)
    ).map((d) => ({ department: d.department, count: d.count }));

    const leaveRows = (
      await db
        .select({ status: leaves.status, count: sql<number>`count(*)::int` })
        .from(leaves)
        .where(
          and(
            eq(leaves.tenantId, user.tenantId),
            gte(leaves.startDate, from),
            lte(leaves.startDate, to),
          ),
        )
        .groupBy(leaves.status)
    ).map((l) => ({ status: l.status, count: l.count }));

    const attendanceRows = (
      await db
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
        .groupBy(attendanceRecords.status)
    ).map((a) => ({ status: a.status, count: a.count }));

    const payrollRows = (
      await db
        .select({
          period: payrollRuns.period,
          total: payrollRuns.total,
          employees: payrollRuns.employees,
          status: payrollRuns.status,
        })
        .from(payrollRuns)
        .where(
          and(
            eq(payrollRuns.tenantId, user.tenantId),
            gte(sql`${payrollRuns.processedAt}::date`, from),
            lte(sql`${payrollRuns.processedAt}::date`, to),
          ),
        )
        .orderBy(desc(payrollRuns.processedAt))
    ).map((r) => ({
      period: r.period,
      total: r.total,
      employees: r.employees,
      status: r.status,
    }));

    const sections = [
      ["Employees", rowsToCsv(employeeRows)],
      ["Departments", rowsToCsv(departmentRows)],
      ["Leave", rowsToCsv(leaveRows)],
      ["Attendance", rowsToCsv(attendanceRows)],
      ["Payroll Runs", rowsToCsv(payrollRows)],
    ];
    const csv = sections
      .filter(([, body]) => body)
      .map(([title, body]) => `${title}\n${body}`)
      .join("\n\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="workforce-report.csv"',
      },
    });
  } finally {
    await pool.end();
  }
});
