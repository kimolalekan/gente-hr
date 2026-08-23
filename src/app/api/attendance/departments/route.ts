import { and, eq } from "drizzle-orm";
import { getDb, ok, requireRole, route } from "@/lib/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface DepartmentStats {
  present: number;
  late: number;
  remote: number;
  onLeave: number;
  absent: number;
  active: number;
}

/** Per-department attendance breakdown for today. */
export const GET = route(async () => {
  const user = await requireRole(["admin", "hr"]);
  const { db, pool } = await getDb();
  try {
    const { attendanceRecords, employees } = await import("@db/schema");
    const date = todayStr();

    const [records, employeeRows] = await Promise.all([
      db
        .select({
          employeeId: attendanceRecords.employeeId,
          status: attendanceRecords.status,
        })
        .from(attendanceRecords)
        .where(
          and(
            eq(attendanceRecords.tenantId, user.tenantId),
            eq(attendanceRecords.date, date),
          ),
        ),
      db
        .select({
          id: employees.id,
          department: employees.department,
          status: employees.status,
        })
        .from(employees)
        .where(eq(employees.tenantId, user.tenantId)),
    ]);

    const recordStatus = new Map(records.map((r) => [r.employeeId, r.status]));
    const byDepartment = new Map<string, DepartmentStats>();

    for (const employee of employeeRows) {
      const key = employee.department ?? "Unassigned";
      const stats =
        byDepartment.get(key) ??
        ({ present: 0, late: 0, remote: 0, onLeave: 0, absent: 0, active: 0 } satisfies DepartmentStats);
      if (employee.status === "on_leave") {
        stats.onLeave++;
      } else if (employee.status === "active") {
        stats.active++;
        const status = recordStatus.get(employee.id);
        if (status === "present") stats.present++;
        else if (status === "late") stats.late++;
        else if (status === "remote") stats.remote++;
        else stats.absent++;
      }
      byDepartment.set(key, stats);
    }

    const rows = [...byDepartment.entries()].map(([department, stats]) => ({
      department,
      present: stats.present,
      late: stats.late,
      remote: stats.remote,
      on_leave: stats.onLeave,
      absent: stats.absent,
      total:
        stats.present + stats.late + stats.remote + stats.onLeave + stats.absent,
    }));
    return ok(rows);
  } finally {
    await pool.end();
  }
});
