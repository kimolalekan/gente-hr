import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { NextResponse } from "next/server";
import {
  ApiError,
  asString,
  getDb,
  requireRole,
  route,
} from "@/lib/server/api";
import { formatAddress } from "@/lib/hr-data";

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

/** Export the employee directory as CSV (admin, hr). */
export const GET = route(async (request: Request) => {
  const user = await requireRole(["admin", "hr"]);
  const url = new URL(request.url);
  const format = asString(url.searchParams.get("format")) || "csv";
  if (format === "pdf") throw new ApiError(400, "PDF export not supported");
  if (format !== "csv") throw new ApiError(400, "Unsupported export format");
  const department = asString(url.searchParams.get("department")).trim();

  const { db, pool } = await getDb();
  try {
    const { employees, salary } = await import("@db/schema");

    const manager = alias(employees, "manager");
    const rows = await db
      .select({
        id: employees.id,
        name: employees.name,
        email: employees.email,
        employeeId: employees.employeeId,
        role: employees.designation,
        department: employees.department,
        address: employees.address,
        phone: employees.phone,
        status: employees.status,
        joinDate: employees.joinDate,
        managerName: manager.name,
      })
      .from(employees)
      .leftJoin(manager, eq(employees.managerId, manager.id))
      .where(
        and(
          eq(employees.tenantId, user.tenantId),
          department ? eq(employees.department, department) : undefined,
        ),
      )
      .orderBy(asc(employees.name));

    // Latest salary (by effective date) per employee, else 0.
    const ids = rows.map((r) => r.id);
    const salaryMap = new Map<string, number>();
    if (ids.length > 0) {
      const salaryRows = await db
        .select({ employeeId: salary.employeeId, gross: salary.gross })
        .from(salary)
        .where(
          and(
            eq(salary.tenantId, user.tenantId),
            inArray(salary.employeeId, ids),
          ),
        )
        .orderBy(desc(salary.effectiveFrom));
      for (const s of salaryRows) {
        if (!salaryMap.has(s.employeeId)) salaryMap.set(s.employeeId, s.gross);
      }
    }

    const items: Row[] = rows.map((r) => ({
      name: r.name,
      email: r.email,
      employeeId: r.employeeId,
      role: r.role ?? "",
      department: r.department ?? "",
      address: formatAddress(r.address),
      phone: r.phone ?? "",
      status: r.status,
      joined: r.joinDate ?? "",
      manager: r.managerName ?? "",
      salary: salaryMap.get(r.id) ?? 0,
    }));

    return new NextResponse(rowsToCsv(items), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="employees.csv"',
      },
    });
  } finally {
    await pool.end();
  }
});
