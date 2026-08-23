import {
  ApiError,
  asString,
  getDb,
  getEmployeeForUser,
  ok,
  parseJson,
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

/** Check in for today (member self-service). */
export const POST = route(async (request: Request) => {
  const user = await requireRole(["member"]);
  const { db, pool } = await getDb();
  try {
    const { attendanceRecords } = await import("@db/schema");
    const employee = await getEmployeeForUser(user.tenantId, user.id);
    if (!employee) {
      throw new ApiError(403, "No employee profile linked to your account");
    }

    const body = await parseJson(request);
    const location = asString(body?.location) || null;
    const source = asString(body?.source) || "device";
    const date = todayStr();
    const checkIn = nowHHMM();
    const status = checkIn > "09:00" ? "late" : "present";

    // One row per employee per day — a second check-in refreshes the record.
    const [record] = await db
      .insert(attendanceRecords)
      .values({
        tenantId: user.tenantId,
        employeeId: employee.id,
        date,
        checkIn,
        status,
        location,
        source,
      })
      .onConflictDoUpdate({
        target: [attendanceRecords.employeeId, attendanceRecords.date],
        set: { checkIn, status, source, location },
      })
      .returning();

    return ok({ ...record, hours: toNumOrNull(record.hours) });
  } finally {
    await pool.end();
  }
});
