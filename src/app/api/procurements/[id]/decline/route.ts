import { and, eq } from "drizzle-orm";
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
import { toProcurement } from "@/lib/server/procurement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** PATCH /api/procurements/[id]/decline — mark a request DECLINED. Admin/HR only. */
export const PATCH = route(
  async (
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const user = await requireRole(["admin", "hr"]);
    const { id } = await params;

    const { db, pool } = await getDb();
    try {
      const { procurementRequests, employees } = await import("@db/schema");

      const [existing] = await db
        .select()
        .from(procurementRequests)
        .where(
          and(
            eq(procurementRequests.id, id),
            eq(procurementRequests.tenantId, user.tenantId),
          ),
        )
        .limit(1);
      if (!existing) throw new ApiError(404, "Request not found");
      if (existing.status !== "PENDING") {
        throw new ApiError(409, "Request has already been decided");
      }

      const [updated] = await db
        .update(procurementRequests)
        .set({
          status: "DECLINED",
          approvedById: user.id,
          updatedAt: new Date(),
        })
        .where(eq(procurementRequests.id, id))
        .returning();

      const [requester] = await db
        .select({
          id: employees.id,
          name: employees.name,
          email: employees.email,
          userId: employees.userId,
        })
        .from(employees)
        .where(eq(employees.id, existing.requestedById))
        .limit(1);
      if (requester) {
        await recordEmail({
          tenantId: user.tenantId,
          to: requester.email,
          templateKey: "procurement_declined",
        });
        if (requester.userId) {
          await notify({
            tenantId: user.tenantId,
            userId: requester.userId,
            type: "procurement",
            title: "Procurement declined",
            body: `"${updated.title}" was declined. Reach out if you have questions.`,
            href: `/procurements/${updated.id}`,
          });
        }
      }

      await addAudit({
        tenantId: user.tenantId,
        userId: user.id,
        actorName: user.name,
        action: "procurement.decline",
        target: updated.id,
        category: "procurement",
      });

      return ok(
        toProcurement({
          row: updated,
          requester: requester
            ? { id: requester.id, name: requester.name, email: requester.email }
            : null,
          approver: { id: user.id, name: user.name, email: user.email },
        }),
      );
    } finally {
      await pool.end();
    }
  },
);
