import { and, eq } from "drizzle-orm";
import {
  ApiError,
  getDb,
  getEmployeeForUser,
  ok,
  requireUser,
  route,
} from "@/lib/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Payslip detail (admin, hr; member: own) with employee name. */
export const GET = route(
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
        .select({
          id: payslips.id,
          employeeId: payslips.employeeId,
          employeeName: employees.name,
          employeeEmail: employees.email,
          period: payslips.period,
          basic: payslips.basic,
          hra: payslips.hra,
          allowances: payslips.allowances,
          bonus: payslips.bonus,
          tax: payslips.tax,
          pension: payslips.pension,
          insurance: payslips.insurance,
          loanEmi: payslips.loanEmi,
          gross: payslips.gross,
          net: payslips.net,
          status: payslips.status,
          generatedAt: payslips.generatedAt,
          createdAt: payslips.createdAt,
        })
        .from(payslips)
        .leftJoin(employees, eq(payslips.employeeId, employees.id))
        .where(and(eq(payslips.id, id), eq(payslips.tenantId, user.tenantId)))
        .limit(1);
      if (!payslip) throw new ApiError(404, "Payslip not found");

      if (user.role === "member") {
        const employee = await getEmployeeForUser(user.tenantId, user.id);
        if (!employee || employee.id !== payslip.employeeId) {
          throw new ApiError(403, "You can't view this payslip");
        }
      }
      return ok(payslip);
    } finally {
      await pool.end();
    }
  },
);
