import { and, eq } from "drizzle-orm";
import {
  ApiError,
  asString,
  getDb,
  ok,
  parseJson,
  requireRole,
  route,
  toNumOrNull,
} from "@/lib/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const STATUSES = ["present", "late", "remote", "on_leave", "absent"];

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** Correct an attendance record (status, times, location). */
export const PATCH = route(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireRole(["admin", "hr"]);
    const { id } = await params;

    const { db, pool } = await getDb();
    try {
      const { attendanceRecords } = await import("@db/schema");
      const body = await parseJson(request);

      const [existing] = await db
        .select()
        .from(attendanceRecords)
        .where(
          and(
            eq(attendanceRecords.id, id),
            eq(attendanceRecords.tenantId, user.tenantId),
          ),
        )
        .limit(1);
      if (!existing) throw new ApiError(404, "Attendance record not found");

      const set: Partial<typeof attendanceRecords.$inferInsert> = {};
      if (body?.status !== undefined) {
        const s = asString(body.status);
        if (!STATUSES.includes(s)) throw new ApiError(422, "Invalid status");
        set.status = s;
      }
      if (body?.checkIn !== undefined) {
        const v = asString(body.checkIn);
        if (!HHMM.test(v)) throw new ApiError(422, "checkIn must be HH:MM");
        set.checkIn = v;
      }
      if (body?.checkOut !== undefined) {
        const v = asString(body.checkOut);
        if (!HHMM.test(v)) throw new ApiError(422, "checkOut must be HH:MM");
        set.checkOut = v;
      }
      if (body?.location !== undefined) {
        set.location = asString(body.location) || null;
      }

      // Recompute hours whenever either time changes and both are known.
      if (set.checkIn !== undefined || set.checkOut !== undefined) {
        const checkIn = set.checkIn ?? existing.checkIn;
        const checkOut = set.checkOut ?? existing.checkOut;
        if (checkIn && checkOut) {
          const hours =
            Math.max(0, toMinutes(checkOut) - toMinutes(checkIn)) / 60;
          set.hours = Math.round(hours * 10) / 10;
        }
      }
      if (Object.keys(set).length === 0) {
        throw new ApiError(422, "No fields to update");
      }

      const [record] = await db
        .update(attendanceRecords)
        .set(set)
        .where(eq(attendanceRecords.id, id))
        .returning();

      return ok({ ...record, hours: toNumOrNull(record.hours) });
    } finally {
      await pool.end();
    }
  },
);
