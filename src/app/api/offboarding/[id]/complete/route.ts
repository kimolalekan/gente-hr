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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Mark an exit process completed. */
export const POST = route(
  async (
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const user = await requireRole(["admin", "hr"]);
    const { id } = await params;

    const { db, pool } = await getDb();
    try {
      const { offboardings, employees } = await import("@db/schema");

      const [offboarding] = await db
        .update(offboardings)
        .set({ status: "completed" })
        .where(
          and(
            eq(offboardings.id, id),
            eq(offboardings.tenantId, user.tenantId),
          ),
        )
        .returning();
      if (!offboarding) throw new ApiError(404, "Offboarding record not found");

      const [employee] = await db
        .select()
        .from(employees)
        .where(eq(employees.id, offboarding.employeeId))
        .limit(1);

      if (employee) {
        await recordEmail({
          tenantId: user.tenantId,
          to: employee.email,
          templateKey: "offboarding_complete",
        });
        if (employee.userId) {
          await notify({
            tenantId: user.tenantId,
            userId: employee.userId,
            type: "offboarding",
            title: "Offboarding complete",
            body: "Your offboarding process has been completed. Thank you for your time with us.",
            href: "/offboarding",
          });
        }
      }
      await addAudit({
        tenantId: user.tenantId,
        userId: user.id,
        actorName: user.name,
        action: "offboarding.complete",
        target: offboarding.id,
        category: "offboarding",
      });

      return ok(offboarding);
    } finally {
      await pool.end();
    }
  },
);
