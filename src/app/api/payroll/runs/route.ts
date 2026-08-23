import { and, desc, eq, or, sql } from "drizzle-orm";
import {
  addAudit,
  asInt,
  asString,
  getDb,
  notify,
  ok,
  paginate,
  parseJson,
  recordEmail,
  requireRole,
  route,
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

function currentPeriod(): string {
  const d = new Date();
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Payroll run history (admin, hr), newest first, paginated. */
export const GET = route(async (request: Request) => {
  const user = await requireRole(["admin", "hr"]);
  const { db, pool } = await getDb();
  try {
    const { payrollRuns } = await import("@db/schema");
    const url = new URL(request.url);
    const page = asInt(url.searchParams.get("page"), 1);
    const pageSize = asInt(url.searchParams.get("pageSize"), 20);
    const rows = await db
      .select()
      .from(payrollRuns)
      .where(eq(payrollRuns.tenantId, user.tenantId))
      .orderBy(desc(payrollRuns.processedAt), desc(payrollRuns.createdAt));
    return ok(paginate(rows, page, pageSize));
  } finally {
    await pool.end();
  }
});

/**
 * Run payroll (admin, hr): compute monthly gross/deductions/net for every
 * active employee with a salary record, then persist run, entries, payslips.
 */
export const POST = route(async (request: Request) => {
  const user = await requireRole(["admin", "hr"]);
  const body = await parseJson(request);
  const period = asString(body?.period).trim() || currentPeriod();
  const email = asString(body?.email).trim();

  const { db, pool } = await getDb();
  try {
    const { employees, salary, loans, payrollRuns, payrollEntries, payslips } =
      await import("@db/schema");

    // Latest salary row per employee (history ordered by effective date).
    const salaryRows = await db
      .select()
      .from(salary)
      .where(eq(salary.tenantId, user.tenantId))
      .orderBy(desc(salary.effectiveFrom), desc(salary.createdAt));
    const latestSalary = new Map<string, typeof salary.$inferSelect>();
    for (const row of salaryRows) {
      if (!latestSalary.has(row.employeeId))
        latestSalary.set(row.employeeId, row);
    }

    const activeEmployees = await db
      .select()
      .from(employees)
      .where(
        and(
          eq(employees.tenantId, user.tenantId),
          eq(employees.status, "active"),
        ),
      );

    // Active/approved loans contribute their EMI to monthly deductions.
    const loanRows = await db
      .select()
      .from(loans)
      .where(
        and(
          eq(loans.tenantId, user.tenantId),
          or(eq(loans.status, "active"), eq(loans.status, "approved")),
        ),
      );
    const loanEmiByEmployee = new Map<string, number>();
    for (const loan of loanRows) {
      loanEmiByEmployee.set(
        loan.employeeId,
        (loanEmiByEmployee.get(loan.employeeId) ?? 0) + (loan.monthlyEmi ?? 0),
      );
    }

    const entries: Array<{
      employeeId: string;
      gross: number;
      deductions: number;
      net: number;
    }> = [];
    for (const emp of activeEmployees) {
      const sal = latestSalary.get(emp.id);
      if (!sal) continue;
      const grossMonthly = Math.round(sal.gross / 12);
      const loanEmi = loanEmiByEmployee.get(emp.id) ?? 0;
      const deductions =
        Math.round(sal.tax / 12) +
        Math.round(sal.pension / 12) +
        Math.round(sal.insurance / 12) +
        loanEmi;
      const net = grossMonthly - deductions;
      entries.push({
        employeeId: emp.id,
        gross: grossMonthly,
        deductions,
        net,
      });
    }
    const total = entries.reduce((sum, e) => sum + e.net, 0);

    const [run] = await db
      .insert(payrollRuns)
      .values({
        tenantId: user.tenantId,
        period,
        status: "processing",
        total,
        employees: entries.length,
      })
      .returning();
    await db
      .update(payrollRuns)
      .set({ status: "completed" })
      .where(eq(payrollRuns.id, run.id));

    if (entries.length > 0) {
      await db.insert(payrollEntries).values(
        entries.map((e) => ({
          tenantId: user.tenantId,
          runId: run.id,
          employeeId: e.employeeId,
          gross: e.gross,
          deductions: e.deductions,
          net: e.net,
          status: "paid",
        })),
      );

      const payslipValues = entries
        .map((e) => {
          const sal = latestSalary.get(e.employeeId);
          if (!sal) return null;
          return {
            tenantId: user.tenantId,
            employeeId: e.employeeId,
            period,
            basic: Math.round(sal.basic / 12),
            hra: Math.round(sal.hra / 12),
            allowances: Math.round(sal.allowances / 12),
            bonus: Math.round(sal.bonus / 12),
            tax: Math.round(sal.tax / 12),
            pension: Math.round(sal.pension / 12),
            insurance: Math.round(sal.insurance / 12),
            loanEmi: loanEmiByEmployee.get(e.employeeId) ?? 0,
            gross: e.gross,
            net: e.net,
            status: "paid",
            generatedAt: new Date(),
          };
        })
        .filter((v): v is NonNullable<typeof v> => v !== null);
      await db
        .insert(payslips)
        .values(payslipValues)
        .onConflictDoUpdate({
          target: [payslips.employeeId, payslips.period],
          set: {
            basic: sql`excluded.basic`,
            hra: sql`excluded.hra`,
            allowances: sql`excluded.allowances`,
            bonus: sql`excluded.bonus`,
            tax: sql`excluded.tax`,
            pension: sql`excluded.pension`,
            insurance: sql`excluded.insurance`,
            loanEmi: sql`excluded.loan_emi`,
            gross: sql`excluded.gross`,
            net: sql`excluded.net`,
            status: sql`excluded.status`,
            generatedAt: sql`excluded.generated_at`,
          },
        });
    }

    // Payroll summary email + one payslip email + notification per employee.
    await recordEmail({
      tenantId: user.tenantId,
      to: email || user.email,
      templateKey: "payroll",
    });
    const employeeById = new Map(activeEmployees.map((e) => [e.id, e]));
    for (const e of entries) {
      const emp = employeeById.get(e.employeeId);
      if (!emp) continue;
      await recordEmail({
        tenantId: user.tenantId,
        to: emp.email,
        templateKey: "payslip",
      });
      if (emp.userId) {
        await notify({
          tenantId: user.tenantId,
          userId: emp.userId,
          type: "payroll",
          title: "Payslip available",
          body: `Your payslip for ${period} is ready.`,
          href: "/payroll/payslips",
        });
      }
    }
    await addAudit({
      tenantId: user.tenantId,
      userId: user.id,
      actorName: user.name,
      action: "payroll.run",
      target: run.id,
      category: "payroll",
    });

    return ok({ ...run, entries }, { status: 201 });
  } finally {
    await pool.end();
  }
});
