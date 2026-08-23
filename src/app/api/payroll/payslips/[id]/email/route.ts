import { and, eq } from "drizzle-orm";
import {
  ApiError,
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
 * Email a payslip. Members send their own payslip to themselves (the logged-in
 * user); admin/HR send it to the employee — plus an in-app notification.
 */
export const POST = route(
  async (
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const user = await requireUser();
    const { id } = await params;

    const { db, pool } = await getDb();
    try {
      const { payslips, employees } = await import("@db/schema");
      const [payslip] = await db
        .select()
        .from(payslips)
        .where(and(eq(payslips.id, id), eq(payslips.tenantId, user.tenantId)))
        .limit(1);
      if (!payslip) throw new ApiError(404, "Payslip not found");

      let to = "";
      let recipientUserId: string | null = null;
      if (user.role === "member") {
        // Self-service: the PDF goes to the logged-in user's own email.
        const employee = await getEmployeeForUser(user.tenantId, user.id);
        if (!employee) {
          throw new ApiError(403, "No employee profile linked to your account");
        }
        if (payslip.employeeId !== employee.id) {
          throw new ApiError(404, "Payslip not found");
        }
        to = user.email;
        recipientUserId = user.id;
      } else {
        const [employee] = await db
          .select()
          .from(employees)
          .where(eq(employees.id, payslip.employeeId))
          .limit(1);
        if (!employee) throw new ApiError(404, "Employee not found");
        to = employee.email;
        recipientUserId = employee.userId;
      }

      await recordEmail({
        tenantId: user.tenantId,
        to,
        templateKey: "payslip",
      });
      if (recipientUserId) {
        await notify({
          tenantId: user.tenantId,
          userId: recipientUserId,
          type: "payroll",
          title: "Payslip sent",
          body: `Your payslip for ${payslip.period} was emailed to you.`,
          href: "/payroll/payslips",
        });
      }
      return ok({ sent: true, to });
    } finally {
      await pool.end();
    }
  },
);
