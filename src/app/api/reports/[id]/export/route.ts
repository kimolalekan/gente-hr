import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
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

type Db = Awaited<ReturnType<typeof getDb>>["db"];
type Row = Record<string, unknown>;

/** Build the rows for a report (mirrors GET /api/reports/[id]). */
async function getReportData(
  db: Db,
  tenantId: string,
  id: string,
  from: string,
  to: string,
): Promise<Row[]> {
  const { employees, leaves, attendanceRecords, payrollRuns } =
    await import("@db/schema");

  if (id === "employees") {
    const grouped = await db
      .select({
        department: employees.department,
        count: sql<number>`count(*)::int`,
      })
      .from(employees)
      .where(eq(employees.tenantId, tenantId))
      .groupBy(employees.department);
    return grouped.map((g) => ({
      department: g.department ?? "Unassigned",
      count: g.count,
    }));
  }
  if (id === "leave") {
    const grouped = await db
      .select({ status: leaves.status, count: sql<number>`count(*)::int` })
      .from(leaves)
      .where(
        and(
          eq(leaves.tenantId, tenantId),
          gte(leaves.startDate, from),
          lte(leaves.startDate, to),
        ),
      )
      .groupBy(leaves.status);
    return grouped.map((g) => ({ status: g.status, count: g.count }));
  }
  if (id === "attendance") {
    const grouped = await db
      .select({
        status: attendanceRecords.status,
        count: sql<number>`count(*)::int`,
      })
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.tenantId, tenantId),
          gte(attendanceRecords.date, from),
          lte(attendanceRecords.date, to),
        ),
      )
      .groupBy(attendanceRecords.status);
    return grouped.map((g) => ({ status: g.status, count: g.count }));
  }
  if (id === "payroll") {
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
          eq(payrollRuns.tenantId, tenantId),
          gte(sql`${payrollRuns.processedAt}::date`, from),
          lte(sql`${payrollRuns.processedAt}::date`, to),
        ),
      )
      .orderBy(desc(payrollRuns.processedAt));
    return runs.map((r) => ({
      period: r.period,
      total: r.total,
      employees: r.employees,
      status: r.status,
      processedAt: r.processedAt.toISOString(),
    }));
  }
  return [];
}

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

/** Export a report as CSV (admin, hr). PDF export is not supported. */
export const GET = route(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireRole(["admin", "hr"]);
    const { id } = await params;
    const url = new URL(request.url);
    const format = asString(url.searchParams.get("format")) || "csv";
    if (format === "pdf") throw new ApiError(400, "PDF export not supported");
    if (format !== "csv") throw new ApiError(400, "Unsupported export format");
    if (!["employees", "leave", "attendance", "payroll"].includes(id)) {
      throw new ApiError(404, "Report not found");
    }

    const { db, pool } = await getDb();
    try {
      const { from, to } = parseRange(
        asString(url.searchParams.get("from")),
        asString(url.searchParams.get("to")),
      );
      const rows = await getReportData(db, user.tenantId, id, from, to);
      const csv = rowsToCsv(rows);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${id}-report.csv"`,
        },
      });
    } finally {
      await pool.end();
    }
  },
);
