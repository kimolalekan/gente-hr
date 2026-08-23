import { and, eq } from "drizzle-orm";
import { getDb, ok, requireRole, route } from "@/lib/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Today's attendance summary: present / late / remote / on leave / absent. */
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
        .select({ id: employees.id, status: employees.status })
        .from(employees)
        .where(eq(employees.tenantId, user.tenantId)),
    ]);

    let present = 0;
    let late = 0;
    let remote = 0;
    const withRecord = new Set<string>();
    for (const record of records) {
      withRecord.add(record.employeeId);
      if (record.status === "present") present++;
      else if (record.status === "late") late++;
      else if (record.status === "remote") remote++;
    }

    let onLeave = 0;
    let absent = 0;
    for (const employee of employeeRows) {
      if (employee.status === "on_leave") {
        onLeave++;
      } else if (employee.status === "active") {
        if (!withRecord.has(employee.id)) absent++;
      }
    }

    const total = present + late + remote + onLeave + absent;
    return ok({ present, late, remote, on_leave: onLeave, absent, total });
  } finally {
    await pool.end();
  }
});
