import { and, eq, gte, lte, sql } from "drizzle-orm";
import { getDb, ok, requireRole, route } from "@/lib/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

function weekdayShort(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "short" });
}

/** Last 7 days: { date, day, presentPct } of active headcount present. */
export const GET = route(async () => {
  const user = await requireRole(["admin", "hr"]);
  const { db, pool } = await getDb();
  try {
    const { attendanceRecords, employees } = await import("@db/schema");
    const today = todayStr();
    const from = addDays(today, -6);

    const [records, activeCountRows] = await Promise.all([
      db
        .select({
          date: attendanceRecords.date,
          status: attendanceRecords.status,
        })
        .from(attendanceRecords)
        .where(
          and(
            eq(attendanceRecords.tenantId, user.tenantId),
            gte(attendanceRecords.date, from),
            lte(attendanceRecords.date, today),
          ),
        ),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(employees)
        .where(
          and(
            eq(employees.tenantId, user.tenantId),
            eq(employees.status, "active"),
          ),
        ),
    ]);

    const perDay = new Map<string, number>();
    for (const record of records) {
      if (
        record.status === "present" ||
        record.status === "late" ||
        record.status === "remote"
      ) {
        perDay.set(record.date, (perDay.get(record.date) ?? 0) + 1);
      }
    }

    const active = activeCountRows[0]?.count ?? 0;
    const days = [];
    for (let offset = 6; offset >= 0; offset--) {
      const date = addDays(today, -offset);
      const present = perDay.get(date) ?? 0;
      days.push({
        date,
        day: weekdayShort(date),
        presentPct: active > 0 ? Math.round((present / active) * 100) : 0,
      });
    }
    return ok(days);
  } finally {
    await pool.end();
  }
});
