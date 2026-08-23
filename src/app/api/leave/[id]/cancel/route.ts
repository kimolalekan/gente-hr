import { and, eq } from "drizzle-orm";
import {
  ApiError,
  addAudit,
  getDb,
  getEmployeeForUser,
  notify,
  ok,
  recordEmail,
  requireUser,
  route,
} from "@/lib/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cancel a leave request. Admins/HR can cancel any request; a member can only
 * cancel their own pending request.
 */
export const PATCH = route(
  async (
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const user = await requireUser();
    const { id } = await params;

    const { db, pool } = await getDb();
    try {
      const { leaves, employees } = await import("@db/schema");

      const [leave] = await db
        .select()
        .from(leaves)
        .where(and(eq(leaves.id, id), eq(leaves.tenantId, user.tenantId)))
        .limit(1);
      if (!leave) throw new ApiError(404, "Leave request not found");

      if (user.role === "member") {
        const employee = await getEmployeeForUser(user.tenantId, user.id);
        if (!employee || employee.id !== leave.employeeId) {
          throw new ApiError(403, "You don't have permission to do this");
        }
        if (leave.status !== "pending") {
          throw new ApiError(403, "Only pending requests can be cancelled");
        }
      }

      const [updated] = await db
        .update(leaves)
        .set({ status: "cancelled" })
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
          templateKey: "leave_cancelled",
        });
        if (employee.userId) {
          await notify({
            tenantId: user.tenantId,
            userId: employee.userId,
            type: "leave",
            title: "Leave request cancelled",
            body: `Your ${leave.type} leave (${leave.startDate} → ${leave.endDate}) was cancelled.`,
            href: "/leave",
          });
        }
      }
      await addAudit({
        tenantId: user.tenantId,
        userId: user.id,
        actorName: user.name,
        action: "leave.cancel",
        target: leave.id,
        category: "leave",
      });

      return ok(updated);
    } finally {
      await pool.end();
    }
  },
);
