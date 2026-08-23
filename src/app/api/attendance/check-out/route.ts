import { and, eq } from "drizzle-orm";
import {
  ApiError,
  getDb,
  getEmployeeForUser,
  ok,
  requireRole,
  route,
  toNumOrNull,
} from "@/lib/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** Check out for today — computes hours and settles the status. */
export const POST = route(async () => {
  const user = await requireRole(["member"]);
  const { db, pool } = await getDb();
  try {
    const { attendanceRecords } = await import("@db/schema");
    const employee = await getEmployeeForUser(user.tenantId, user.id);
    if (!employee) {
      throw new ApiError(403, "No employee profile linked to your account");
    }

    const date = todayStr();
    const [existing] = await db
      .select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.employeeId, employee.id),
          eq(attendanceRecords.date, date),
        ),
      )
      .limit(1);
    if (!existing?.checkIn) {
      throw new ApiError(422, "No check-in record for today");
    }

    const checkOut = nowHHMM();
    const hours =
      Math.max(0, toMinutes(checkOut) - toMinutes(existing.checkIn)) / 60;
    const roundedHours = Math.round(hours * 10) / 10;
    const status = existing.status === "late" ? "late" : "present";

    const [record] = await db
      .update(attendanceRecords)
      .set({ checkOut, hours: roundedHours, status })
      .where(eq(attendanceRecords.id, existing.id))
      .returning();

    return ok({ ...record, hours: toNumOrNull(record.hours) });
  } finally {
    await pool.end();
  }
});
