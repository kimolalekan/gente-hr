import { and, asc, eq, gte, lte } from "drizzle-orm";
import { NextResponse } from "next/server";
import { asString, getDb, ok, requireRole, route } from "@/lib/server/api";
import { parseRange } from "@/lib/report-dates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Quote a CSV cell when it contains a comma, quote or newline. */
function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Attendance report (JSON or CSV) for a date range (default: last 7 days). */
export const GET = route(async (request: Request) => {
  const user = await requireRole(["admin", "hr"]);
  const url = new URL(request.url);
  const format = asString(url.searchParams.get("format")) || "json";
  const { from, to } = parseRange(
    asString(url.searchParams.get("from")),
    asString(url.searchParams.get("to")),
  );

  const { db, pool } = await getDb();
  try {
    const { attendanceRecords, employees } = await import("@db/schema");
    const rows = await db
      .select({
        employeeName: employees.name,
        date: attendanceRecords.date,
        checkIn: attendanceRecords.checkIn,
        checkOut: attendanceRecords.checkOut,
        hours: attendanceRecords.hours,
        status: attendanceRecords.status,
        location: attendanceRecords.location,
      })
      .from(attendanceRecords)
      .leftJoin(employees, eq(attendanceRecords.employeeId, employees.id))
      .where(
        and(
          eq(attendanceRecords.tenantId, user.tenantId),
          gte(attendanceRecords.date, from),
          lte(attendanceRecords.date, to),
        ),
      )
      .orderBy(asc(attendanceRecords.date));

    if (format === "csv") {
      const header = "employeeName,date,checkIn,checkOut,hours,status,location";
      const lines = rows.map((row) =>
        [
          row.employeeName ?? "",
          row.date,
          row.checkIn ?? "",
          row.checkOut ?? "",
          String(row.hours ?? ""),
          row.status,
          row.location ?? "",
        ]
          .map(csvCell)
          .join(","),
      );
      const csv = [header, ...lines].join("\n");
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": 'attachment; filename="attendance-report.csv"',
        },
      });
    }

    return ok(rows);
  } finally {
    await pool.end();
  }
});
