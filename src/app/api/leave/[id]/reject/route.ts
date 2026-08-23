import { and, eq } from "drizzle-orm";
import {
  ApiError,
  addAudit,
  asString,
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

/** Reject a leave request. */
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

      const [updated] = await db
        .update(leaves)
        .set({ status: "declined", decidedBy: user.id, decidedAt: new Date() })
        .where(and(eq(leaves.id, id), eq(leaves.tenantId, user.tenantId)))
        .returning();
      if (!updated) throw new ApiError(404, "Leave request not found");

      const rejectReason = asString(body?.reason);
      const [employee] = await db
        .select()
        .from(employees)
        .where(eq(employees.id, updated.employeeId))
        .limit(1);
      if (employee) {
        await recordEmail({
          tenantId: user.tenantId,
          to: employee.email,
          templateKey: "leave_rejected",
        });
        if (employee.userId) {
          await notify({
            tenantId: user.tenantId,
            userId: employee.userId,
            type: "leave",
            title: "Leave request declined",
            body: rejectReason
              ? `Your ${updated.type} leave request was declined: ${rejectReason}`
              : `Your ${updated.type} leave request was declined.`,
            href: "/leave",
          });
        }
      }
      await addAudit({
        tenantId: user.tenantId,
        userId: user.id,
        actorName: user.name,
        action: "leave.reject",
        target: updated.id,
        category: "leave",
      });

      return ok(updated);
    } finally {
      await pool.end();
    }
  },
);
