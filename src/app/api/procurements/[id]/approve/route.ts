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
import { toProcurement } from "@/lib/server/procurement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PATCH /api/procurements/[id]/approve — award the request to one of the
 * quoted vendors (`vendorIndex`) and mark it APPROVED. Admin/HR only.
 */
export const PATCH = route(
  async (
    request: Request,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const user = await requireRole(["admin", "hr"]);
    const { id } = await params;
    const body = await parseJson(request);
    const vendorIndex = asInt(body?.vendorIndex, -1);

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
      if (
        !Array.isArray(existing.vendors) ||
        vendorIndex < 0 ||
        vendorIndex >= existing.vendors.length
      ) {
        throw new ApiError(422, "Choose a valid vendor to award the request to");
      }

      const [updated] = await db
        .update(procurementRequests)
        .set({
          status: "APPROVED",
          approvedVendorIndex: vendorIndex,
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
          templateKey: "procurement_approved",
        });
        if (requester.userId) {
          await notify({
            tenantId: user.tenantId,
            userId: requester.userId,
            type: "procurement",
            title: "Procurement approved",
            body: `"${updated.title}" was approved — the winning quote will be contacted.`,
            href: `/procurements/${updated.id}`,
          });
        }
      }

      await addAudit({
        tenantId: user.tenantId,
        userId: user.id,
        actorName: user.name,
        action: "procurement.approve",
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
