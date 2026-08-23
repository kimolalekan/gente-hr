import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import {
  asInt,
  asString,
  getDb,
  getEmployeeForUser,
  ok,
  paginate,
  requireUser,
  route,
} from "@/lib/server/api";
import { parseRange } from "@/lib/report-dates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Payslips (admin, hr: all; member: own) — date range + period/employee filters, newest first. */
export const GET = route(async (request: Request) => {
  const user = await requireUser();
  const { db, pool } = await getDb();
  try {
    const { payslips, employees } = await import("@db/schema");
    const url = new URL(request.url);
    const period = asString(url.searchParams.get("period"));
    const employeeIdParam = asString(url.searchParams.get("employeeId"));
    const page = asInt(url.searchParams.get("page"), 1);
    const pageSize = asInt(url.searchParams.get("pageSize"), 20);
    const { from, to } = parseRange(
      asString(url.searchParams.get("from")),
      asString(url.searchParams.get("to")),
    );

    const conditions = [
      eq(payslips.tenantId, user.tenantId),
      gte(sql`${payslips.createdAt}::date`, from),
      lte(sql`${payslips.createdAt}::date`, to),
    ];
    if (user.role === "member") {
      const employee = await getEmployeeForUser(user.tenantId, user.id);
      if (!employee) return ok(paginate([], page, pageSize));
      conditions.push(eq(payslips.employeeId, employee.id));
    } else {
      if (period) conditions.push(eq(payslips.period, period));
      if (employeeIdParam)
        conditions.push(eq(payslips.employeeId, employeeIdParam));
    }

    const rows = await db
      .select({
        id: payslips.id,
        employeeId: payslips.employeeId,
        employeeName: employees.name,
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
      .where(and(...conditions))
      .orderBy(desc(payslips.generatedAt), desc(payslips.createdAt));

    return ok(paginate(rows, page, pageSize));
  } finally {
    await pool.end();
  }
});
