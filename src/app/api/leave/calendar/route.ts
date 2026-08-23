import { and, eq, gte, lte, or } from "drizzle-orm";
import {
  ApiError,
  asString,
  getDb,
  ok,
  requireRole,
  route,
} from "@/lib/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Month view of leave — only days with leave overlapping the month. */
export const GET = route(async (request: Request) => {
  const user = await requireRole(["admin", "hr"]);
  const monthParam = asString(new URL(request.url).searchParams.get("month"));

  let year: number;
  let month: number;
  if (monthParam) {
    if (!/^\d{4}-\d{2}$/.test(monthParam)) {
      throw new ApiError(422, "month must be YYYY-MM");
    }
    year = Number(monthParam.slice(0, 4));
    month = Number(monthParam.slice(5));
    if (month < 1 || month > 12) throw new ApiError(422, "Invalid month");
  } else {
    const now = new Date();
    year = now.getFullYear();
    month = now.getMonth() + 1;
  }
  const mm = String(month).padStart(2, "0");
  const startOfMonth = `${year}-${mm}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const endOfMonth = `${year}-${mm}-${String(lastDay).padStart(2, "0")}`;

  const { db, pool } = await getDb();
  try {
    const { leaves, employees } = await import("@db/schema");
    const rows = await db
      .select({
        id: leaves.id,
        employeeId: leaves.employeeId,
        employeeName: employees.name,
        type: leaves.type,
        start: leaves.startDate,
        end: leaves.endDate,
        status: leaves.status,
      })
      .from(leaves)
      .leftJoin(employees, eq(leaves.employeeId, employees.id))
      .where(
        and(
          eq(leaves.tenantId, user.tenantId),
          lte(leaves.startDate, endOfMonth),
          gte(leaves.endDate, startOfMonth),
          or(eq(leaves.status, "approved"), eq(leaves.status, "pending")),
        ),
      );

    const days: Array<{ date: string; leaves: (typeof rows)[number][] }> = [];
    for (let day = 1; day <= lastDay; day++) {
      const date = `${year}-${mm}-${String(day).padStart(2, "0")}`;
      const onDay = rows.filter((r) => r.start <= date && date <= r.end);
      if (onDay.length > 0) days.push({ date, leaves: onDay });
    }

    return ok({ month: `${year}-${mm}`, days });
  } finally {
    await pool.end();
  }
});
