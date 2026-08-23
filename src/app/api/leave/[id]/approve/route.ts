import { and, eq, sql } from "drizzle-orm";
import {
  ApiError,
  addAudit,
  getDb,
  notify,
  ok,
  recordEmail,
  requireRole,
  route,
} from "@/lib/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Approve a leave request — deducts the balance and notifies the employee. */
export const PATCH = route(
  async (
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const user = await requireRole(["admin", "hr"]);
    const { id } = await params;

    const { db, pool } = await getDb();
    try {
      const { leaves, employees, leaveBalances } = await import("@db/schema");

      const [leave] = await db
        .select()
        .from(leaves)
        .where(and(eq(leaves.id, id), eq(leaves.tenantId, user.tenantId)))
        .limit(1);
      if (!leave) throw new ApiError(404, "Leave request not found");
      if (leave.status === "approved") {
        throw new ApiError(409, "Leave request already approved");
      }

      const [updated] = await db
        .update(leaves)
        .set({ status: "approved", decidedBy: user.id, decidedAt: new Date() })
        .where(eq(leaves.id, id))
        .returning();

      // Increment the year's used balance for the leave type (upsert if missing).
      if (leave.type === "vacation" || leave.type === "sick" || leave.type === "personal") {
        const year = Number(leave.startDate.slice(0, 4));
        const [existing] = await db
          .select()
          .from(leaveBalances)
          .where(
            and(
              eq(leaveBalances.employeeId, leave.employeeId),
              eq(leaveBalances.year, year),
            ),
          )
          .limit(1);
        if (!existing) {
          await db.insert(leaveBalances).values({
            tenantId: user.tenantId,
            employeeId: leave.employeeId,
            year,
          });
        }
        const where = and(
          eq(leaveBalances.employeeId, leave.employeeId),
          eq(leaveBalances.year, year),
        );
        if (leave.type === "vacation") {
          await db
            .update(leaveBalances)
            .set({
              vacationUsed: sql`${leaveBalances.vacationUsed} + ${leave.days}`,
              updatedAt: new Date(),
            })
            .where(where);
        } else if (leave.type === "sick") {
          await db
            .update(leaveBalances)
            .set({
              sickUsed: sql`${leaveBalances.sickUsed} + ${leave.days}`,
              updatedAt: new Date(),
            })
            .where(where);
        } else {
          await db
            .update(leaveBalances)
            .set({
              personalUsed: sql`${leaveBalances.personalUsed} + ${leave.days}`,
              updatedAt: new Date(),
            })
            .where(where);
        }
      }

      const [employee] = await db
        .select()
        .from(employees)
        .where(eq(employees.id, leave.employeeId))
        .limit(1);
      if (employee) {
        await recordEmail({
          tenantId: user.tenantId,
          to: employee.email,
          templateKey: "leave_approved",
        });
        if (employee.userId) {
          await notify({
            tenantId: user.tenantId,
            userId: employee.userId,
            type: "leave",
            title: "Leave approved",
            body: `Your ${leave.type} leave (${leave.startDate} → ${leave.endDate}) was approved.`,
            href: "/leave",
          });
        }
      }
      await addAudit({
        tenantId: user.tenantId,
        userId: user.id,
        actorName: user.name,
        action: "leave.approve",
        target: leave.id,
        category: "leave",
      });

      return ok(updated);
    } finally {
      await pool.end();
    }
  },
);
