import { and, desc, eq } from "drizzle-orm";
import {
  ApiError,
  asInt,
  getDb,
  getEmployeeForUser,
  ok,
  paginate,
  requireUser,
  route,
  toNumOrNull,
} from "@/lib/server/api";
import type { SessionUser } from "@/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-fA-F-]{8,}$/;

async function assertAccessibleEmployee(
  user: SessionUser,
  id: string,
): Promise<void> {
  if (user.role === "member") {
    const own = await getEmployeeForUser(user.tenantId, user.id);
    if (!own || own.id !== id) {
      throw new ApiError(403, "You don't have permission to do this");
    }
  } else {
    const { db, pool } = await getDb();
    const { employees } = await import("@db/schema");
    try {
      const rows = await db
        .select({ id: employees.id })
        .from(employees)
        .where(and(eq(employees.id, id), eq(employees.tenantId, user.tenantId)))
        .limit(1);
      if (!rows[0]) throw new ApiError(404, "Employee not found");
    } finally {
      await pool.end();
    }
  }
}

/** GET /api/employees/[id]/attendance — attendance history (newest first). */
export const GET = route(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireUser();
    const { id } = await params;
    if (!UUID_RE.test(id)) throw new ApiError(404, "Not found");
    await assertAccessibleEmployee(user, id);

    const url = new URL(request.url);
    const page = asInt(url.searchParams.get("page"), 1);
    const pageSize = asInt(url.searchParams.get("pageSize"), 20);

    const { db, pool } = await getDb();
    const { attendanceRecords } = await import("@db/schema");
    try {
      const rows = await db
        .select()
        .from(attendanceRecords)
        .where(
          and(
            eq(attendanceRecords.tenantId, user.tenantId),
            eq(attendanceRecords.employeeId, id),
          ),
        )
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
  },
);
