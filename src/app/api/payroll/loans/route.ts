import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import {
  ApiError,
  addAudit,
  asInt,
  asString,
  getDb,
  getEmployeeForUser,
  ok,
  paginate,
  parseJson,
  requireUser,
  route,
  toNumOrNull,
} from "@/lib/server/api";
import { parseRange } from "@/lib/report-dates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOAN_TYPES = ["personal", "advance", "vehicle", "other"];

/** Loans with employee names (admin, hr: all; member: own), date-range filter, paginated. */
export const GET = route(async (request: Request) => {
  const user = await requireUser();
  const { db, pool } = await getDb();
  try {
    const { loans, employees } = await import("@db/schema");
    const url = new URL(request.url);
    const page = asInt(url.searchParams.get("page"), 1);
    const pageSize = asInt(url.searchParams.get("pageSize"), 20);
    const { from, to } = parseRange(
      asString(url.searchParams.get("from")),
      asString(url.searchParams.get("to")),
    );

    const conditions = [
      eq(loans.tenantId, user.tenantId),
      gte(sql`${loans.createdAt}::date`, from),
      lte(sql`${loans.createdAt}::date`, to),
    ];
    if (user.role === "member") {
      const employee = await getEmployeeForUser(user.tenantId, user.id);
      if (!employee) return ok(paginate([], page, pageSize));
      conditions.push(eq(loans.employeeId, employee.id));
    }

    const rows = await db
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
      .where(and(...conditions))
      .orderBy(desc(loans.createdAt));

    return ok(
      paginate(
        rows.map((row) => ({
          ...row,
          interestRate: toNumOrNull(row.interestRate),
        })),
        page,
        pageSize,
      ),
    );
  } finally {
    await pool.end();
  }
});

/** Create a loan request — computes the monthly EMI. */
export const POST = route(async (request: Request) => {
  const user = await requireUser();
  const body = await parseJson(request);
  if (!body) throw new ApiError(400, "Invalid request body");

  const type = asString(body.type);
  const amount = asInt(body.amount);
  const termMonths = asInt(body.termMonths);
  const interestRate = Number(body.interestRate);

  if (!LOAN_TYPES.includes(type)) throw new ApiError(422, "Invalid loan type");
  if (amount <= 0) throw new ApiError(422, "amount must be greater than 0");
  if (termMonths <= 0) {
    throw new ApiError(422, "termMonths must be greater than 0");
  }
  if (!Number.isFinite(interestRate) || interestRate < 0) {
    throw new ApiError(422, "interestRate must be a non-negative number");
  }

  // Members request a loan for themselves; admin/HR pick any employee.
  let employeeId = asString(body.employeeId);
  if (user.role === "member") {
    if (employeeId) {
      throw new ApiError(403, "You can only request a loan for yourself");
    }
    const employee = await getEmployeeForUser(user.tenantId, user.id);
    if (!employee) {
      throw new ApiError(403, "No employee profile linked to your account");
    }
    employeeId = employee.id;
  } else if (!employeeId) {
    throw new ApiError(422, "employeeId is required");
  }

  const r = interestRate / 100 / 12;
  const monthlyEmi =
    r === 0
      ? Math.round(amount / termMonths)
      : Math.round(
          (amount * r * Math.pow(1 + r, termMonths)) /
            (Math.pow(1 + r, termMonths) - 1),
        );

  const { db, pool } = await getDb();
  try {
    const { loans, employees } = await import("@db/schema");
    const [employee] = await db
      .select({ id: employees.id })
      .from(employees)
      .where(
        and(
          eq(employees.tenantId, user.tenantId),
          eq(employees.id, employeeId),
        ),
      )
      .limit(1);
    if (!employee) throw new ApiError(422, "Employee not found");

    const [loan] = await db
      .insert(loans)
      .values({
        tenantId: user.tenantId,
        employeeId,
        type,
        amount,
        interestRate,
        termMonths,
        monthlyEmi,
        status: "pending",
      })
      .returning();

    await addAudit({
      tenantId: user.tenantId,
      userId: user.id,
      actorName: user.name,
      action:
        user.role === "member" ? "payroll.loan.request" : "payroll.loan.create",
      target: loan.id,
      category: "payroll",
    });
    return ok(
      { ...loan, interestRate: toNumOrNull(loan.interestRate) },
      { status: 201 },
    );
  } finally {
    await pool.end();
  }
});
