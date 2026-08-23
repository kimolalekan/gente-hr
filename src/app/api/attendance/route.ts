import { and, desc, eq, gte, lte } from "drizzle-orm";
import {
  ApiError,
  asDate,
  asInt,
  asString,
  getDb,
  getEmployeeForUser,
  ok,
  paginate,
  requireUser,
  route,
  toNumOrNull,
} from "@/lib/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** List attendance records (admin/hr: all; member: own), paginated. */
export const GET = route(async (request: Request) => {
  const user = await requireUser();
  const { db, pool } = await getDb();
  try {
    const { attendanceRecords, employees } = await import("@db/schema");
    const url = new URL(request.url);
    const fromParam = asString(url.searchParams.get("from"));
    const toParam = asString(url.searchParams.get("to"));
    const status = asString(url.searchParams.get("status"));
    const page = asInt(url.searchParams.get("page"), 1);
    const pageSize = asInt(url.searchParams.get("pageSize"), 20);

    const from = fromParam ? asDate(fromParam) : null;
    const to = toParam ? asDate(toParam) : null;
    if (fromParam && !from) throw new ApiError(422, "Invalid from date");
    if (toParam && !to) throw new ApiError(422, "Invalid to date");

    const conditions = [eq(attendanceRecords.tenantId, user.tenantId)];
    if (user.role === "member") {
      const employee = await getEmployeeForUser(user.tenantId, user.id);
      if (!employee) return ok(paginate([], page, pageSize));
      conditions.push(eq(attendanceRecords.employeeId, employee.id));
    }
    if (from) conditions.push(gte(attendanceRecords.date, from));
    if (to) conditions.push(lte(attendanceRecords.date, to));
    if (status) conditions.push(eq(attendanceRecords.status, status));

    const rows = await db
      .select({
        id: attendanceRecords.id,
        employeeId: attendanceRecords.employeeId,
        employeeName: employees.name,
        date: attendanceRecords.date,
        checkIn: attendanceRecords.checkIn,
        checkOut: attendanceRecords.checkOut,
        hours: attendanceRecords.hours,
        status: attendanceRecords.status,
        location: attendanceRecords.location,
        source: attendanceRecords.source,
        createdAt: attendanceRecords.createdAt,
      })
      .from(attendanceRecords)
      .leftJoin(employees, eq(attendanceRecords.employeeId, employees.id))
      .where(and(...conditions))
      .orderBy(desc(attendanceRecords.date));

    return ok(
      paginate(
        rows.map((row) => ({ ...row, hours: toNumOrNull(row.hours) })),
        page,
        pageSize,
      ),
    );
  } finally {
    await pool.end();
  }
});
