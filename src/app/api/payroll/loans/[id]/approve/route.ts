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
  toNumOrNull,
} from "@/lib/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Approve/disburse a loan (admin, hr) — emails + notifies the employee. */
export const PATCH = route(
  async (
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const user = await requireRole(["admin", "hr"]);
    const { id } = await params;

    const { db, pool } = await getDb();
    try {
      const { loans, employees } = await import("@db/schema");
      const [loan] = await db
        .select()
        .from(loans)
        .where(and(eq(loans.id, id), eq(loans.tenantId, user.tenantId)))
        .limit(1);
      if (!loan) throw new ApiError(404, "Loan not found");
      if (loan.status === "active" || loan.status === "paid") {
        throw new ApiError(409, "Loan already disbursed");
      }

      const [updated] = await db
        .update(loans)
        .set({ status: "active", disbursedAt: today() })
        .where(eq(loans.id, id))
        .returning();

      const [employee] = await db
        .select()
        .from(employees)
        .where(eq(employees.id, loan.employeeId))
        .limit(1);
      if (employee) {
        await recordEmail({
          tenantId: user.tenantId,
          to: employee.email,
          templateKey: "loan_approved",
        });
        if (employee.userId) {
          await notify({
            tenantId: user.tenantId,
            userId: employee.userId,
            type: "loan",
            title: "Loan approved",
            body: `Your loan of ${loan.amount} was approved and disbursed.`,
            href: "/payroll/loans",
          });
        }
      }
      await addAudit({
        tenantId: user.tenantId,
        userId: user.id,
        actorName: user.name,
        action: "payroll.loan.approve",
        target: loan.id,
        category: "payroll",
      });
      return ok({
        ...updated,
        interestRate: toNumOrNull(updated.interestRate),
      });
    } finally {
      await pool.end();
    }
  },
);
