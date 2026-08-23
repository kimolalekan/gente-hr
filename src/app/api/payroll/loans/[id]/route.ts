import { and, eq } from "drizzle-orm";
import {
  ApiError,
  getDb,
  getEmployeeForUser,
  ok,
  requireUser,
  route,
  toNumOrNull,
} from "@/lib/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Loan detail (admin, hr; member: own) + reducing-balance repayment schedule. */
export const GET = route(
  async (
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const user = await requireUser();
    const { id } = await params;

    const { db, pool } = await getDb();
    try {
      const { loans, employees } = await import("@db/schema");
      const [loan] = await db
        .select({
          id: loans.id,
          employeeId: loans.employeeId,
          employeeName: employees.name,
          type: loans.type,
          amount: loans.amount,
          interestRate: loans.interestRate,
          termMonths: loans.termMonths,
          monthlyEmi: loans.monthlyEmi,
          disbursedAt: loans.disbursedAt,
          paidMonths: loans.paidMonths,
          status: loans.status,
          createdAt: loans.createdAt,
        })
        .from(loans)
        .leftJoin(employees, eq(loans.employeeId, employees.id))
        .where(and(eq(loans.id, id), eq(loans.tenantId, user.tenantId)))
        .limit(1);
      if (!loan) throw new ApiError(404, "Loan not found");

      if (user.role === "member") {
        const employee = await getEmployeeForUser(user.tenantId, user.id);
        if (!employee || employee.id !== loan.employeeId) {
          throw new ApiError(403, "You can't view this loan");
        }
      }

      const r = (loan.interestRate ?? 0) / 100 / 12;
      let balance = loan.amount;
      const anchor = loan.disbursedAt
        ? new Date(`${loan.disbursedAt}T00:00:00Z`)
        : new Date(loan.createdAt);
      const schedule: Array<{
        month: string;
        principal: number;
        interest: number;
        balance: number;
      }> = [];
      for (let i = 1; i <= loan.termMonths; i++) {
        const interest = Math.round(balance * r);
        const principal = Math.min(loan.monthlyEmi - interest, balance);
        balance = Math.max(0, balance - principal);
        const monthDate = new Date(
          Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + i, 1),
        );
        schedule.push({
          month: `${MONTHS[monthDate.getUTCMonth()]} ${monthDate.getUTCFullYear()}`,
          principal,
          interest,
          balance,
        });
      }

      return ok({
        ...loan,
        interestRate: toNumOrNull(loan.interestRate),
        schedule,
      });
    } finally {
      await pool.end();
    }
  },
);
