import { and, eq } from "drizzle-orm";
import {
  ApiError,
  addAudit,
  asInt,
  getDb,
  notify,
  ok,
  parseJson,
  recordEmail,
  requireRole,
  route,
} from "@/lib/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Extend an approved/pending leave by extraDays. */
export const PATCH = route(
  async (
    request: Request,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const user = await requireRole(["admin", "hr"]);
    const { id } = await params;

    const { db, pool } = await getDb();
    try {
      const { leaves, employees } = await import("@db/schema");
      const body = await parseJson(request);
      const extraDays = asInt(body?.extraDays, 0);
      if (extraDays <= 0) {
        throw new ApiError(422, "extraDays must be a positive integer");
      }

      const [leave] = await db
        .select()
        .from(leaves)
        .where(and(eq(leaves.id, id), eq(leaves.tenantId, user.tenantId)))
        .limit(1);
      if (!leave) throw new ApiError(404, "Leave request not found");

      const [updated] = await db
        .update(leaves)
        .set({
          endDate: addDays(leave.endDate, extraDays),
          days: leave.days + extraDays,
        })
        .where(eq(leaves.id, id))
        .returning();

      const [employee] = await db
        .select()
        .from(employees)
        .where(eq(employees.id, leave.employeeId))
        .limit(1);
      if (employee) {
        await recordEmail({
          tenantId: user.tenantId,
          to: employee.email,
          templateKey: "leave_extended",
        });
        if (employee.userId) {
          await notify({
            tenantId: user.tenantId,
            userId: employee.userId,
            type: "leave",
            title: "Leave extended",
            body: `Your ${leave.type} leave was extended by ${extraDays} day(s) — now ${leave.startDate} → ${updated.endDate}.`,
            href: "/leave",
          });
        }
      }
      await addAudit({
        tenantId: user.tenantId,
        userId: user.id,
        actorName: user.name,
        action: "leave.extend",
        target: leave.id,
        category: "leave",
      });

      return ok(updated);
    } finally {
      await pool.end();
    }
  },
);

/** Add whole days to a YYYY-MM-DD date string. */
function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}
