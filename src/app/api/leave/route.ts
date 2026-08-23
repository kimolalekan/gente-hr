import { and, desc, eq, ilike } from "drizzle-orm";
import {
  ApiError,
  addAudit,
  asDate,
  asInt,
  asString,
  getDb,
  getEmployeeForUser,
  notify,
  ok,
  paginate,
  parseJson,
  recordEmail,
  requireRole,
  requireUser,
  route,
} from "@/lib/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LEAVE_TYPES = ["vacation", "sick", "parental", "other"];

/** Days between two YYYY-MM-DD dates, inclusive. */
function diffDays(start: string, end: string): number {
  return (
    Math.round(
      (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) /
        86400000,
    ) + 1
  );
}

/** List leave requests (admin/hr: all; member: own), paginated. */
export const GET = route(async (request: Request) => {
  const user = await requireUser();
  const { db, pool } = await getDb();
  try {
    const { leaves, employees } = await import("@db/schema");
    const url = new URL(request.url);
    const status = asString(url.searchParams.get("status"));
    const employeeIdParam = asString(url.searchParams.get("employeeId"));
    const q = asString(url.searchParams.get("q"));
    const page = asInt(url.searchParams.get("page"), 1);
    const pageSize = asInt(url.searchParams.get("pageSize"), 20);

    const conditions = [eq(leaves.tenantId, user.tenantId)];
    if (user.role === "member") {
      const employee = await getEmployeeForUser(user.tenantId, user.id);
      if (!employee) return ok(paginate([], page, pageSize));
      conditions.push(eq(leaves.employeeId, employee.id));
    } else {
      if (status) conditions.push(eq(leaves.status, status));
      if (employeeIdParam) conditions.push(eq(leaves.employeeId, employeeIdParam));
    }
    if (q) conditions.push(ilike(employees.name, `%${q}%`));

    const rows = await db
      .select({
        id: leaves.id,
        employeeId: leaves.employeeId,
        employeeName: employees.name,
        type: leaves.type,
        start: leaves.startDate,
        end: leaves.endDate,
        days: leaves.days,
        reason: leaves.reason,
        status: leaves.status,
        createdAt: leaves.createdAt,
      })
      .from(leaves)
      .leftJoin(employees, eq(leaves.employeeId, employees.id))
      .where(and(...conditions))
      .orderBy(desc(leaves.createdAt));

    return ok(paginate(rows, page, pageSize));
  } finally {
    await pool.end();
  }
});

/** Request leave (members only) — validates dates and available balance. */
export const POST = route(async (request: Request) => {
  const user = await requireRole(["member"]);
  const { db, pool } = await getDb();
  try {
    const { leaves, leaveBalances } = await import("@db/schema");
    const employee = await getEmployeeForUser(user.tenantId, user.id);
    if (!employee) {
      throw new ApiError(403, "No employee profile linked to your account");
    }

    const body = await parseJson(request);
    const type = asString(body?.type);
    if (!LEAVE_TYPES.includes(type)) throw new ApiError(422, "Invalid leave type");

    const startDate = asDate(body?.start);
    const endDate = asDate(body?.end);
    if (!startDate || !endDate) {
      throw new ApiError(422, "Invalid start or end date");
    }
    if (endDate < startDate) {
      throw new ApiError(422, "End date must be on or after the start date");
    }
    const days = diffDays(startDate, endDate);

    // Balance check (vacation / sick / personal) — upsert the year's row if
    // it doesn't exist yet (defaults: vacation 25, sick 10, personal 5).
    if (type === "vacation" || type === "sick" || type === "personal") {
      const year = Number(startDate.slice(0, 4));
      const [existing] = await db
        .select()
        .from(leaveBalances)
        .where(
          and(
            eq(leaveBalances.employeeId, employee.id),
            eq(leaveBalances.year, year),
          ),
        )
        .limit(1);
      const balance =
        existing ??
        (
          await db
            .insert(leaveBalances)
            .values({ tenantId: user.tenantId, employeeId: employee.id, year })
            .returning()
        )[0];

      const used =
        type === "vacation"
          ? balance.vacationUsed
          : type === "sick"
            ? balance.sickUsed
            : balance.personalUsed;
      const total =
        type === "vacation"
          ? balance.vacationTotal
          : type === "sick"
            ? balance.sickTotal
            : balance.personalTotal;
      if (used + days > total) {
        const label =
          type === "vacation" ? "vacation" : type === "sick" ? "sick" : "personal";
        throw new ApiError(422, `Insufficient ${label} balance`);
      }
    }

    const [leave] = await db
      .insert(leaves)
      .values({
        tenantId: user.tenantId,
        employeeId: employee.id,
        type,
        startDate,
        endDate,
        days,
        reason: asString(body?.reason) || null,
        status: "pending",
      })
      .returning();

    await recordEmail({
      tenantId: user.tenantId,
      to: employee.email,
      templateKey: "leave_requested",
    });
    await notify({
      tenantId: user.tenantId,
      userId: user.id,
      type: "leave",
      title: "Leave request submitted",
      body: `${type} leave requested for ${startDate} to ${endDate}`,
      href: "/leave",
    });
    await addAudit({
      tenantId: user.tenantId,
      userId: user.id,
      actorName: user.name,
      action: "leave.request",
      target: leave.id,
      category: "leave",
    });

    return ok(leave, { status: 201 });
  } finally {
    await pool.end();
  }
});
