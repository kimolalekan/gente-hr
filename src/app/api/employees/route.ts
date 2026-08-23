import { and, asc, desc, eq, ilike, inArray, or } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  ApiError,
  addAudit,
  asDate,
  asInt,
  asString,
  employeeIdPrefix,
  getDb,
  ok,
  paginate,
  parseJson,
  requireRole,
  route,
} from "@/lib/server/api";
import { mergeSalaryBreakdown, salaryGross } from "@/lib/hr-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-fA-F-]{8,}$/;

interface EmployeeListShape {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string | null;
  department: string | null;
  address: Record<string, unknown> | null;
  status: string;
  joinedAt: string | null;
  employmentType: string;
  employeeId: string;
  manager: string | null;
  salary: number;
}

function optStr(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function asJson(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** GET /api/employees — list with search, filters and pagination. */
export const GET = route(async (request: Request) => {
  const user = await requireRole(["admin", "hr"]);
  const url = new URL(request.url);
  const q = asString(url.searchParams.get("q")).trim();
  const department = asString(url.searchParams.get("department")).trim();
  const status = asString(url.searchParams.get("status")).trim();
  const page = asInt(url.searchParams.get("page"), 1);
  const pageSize = asInt(url.searchParams.get("pageSize"), 20);

  const { db, pool } = await getDb();
  const { employees, salary } = await import("@db/schema");
  try {
    const conditions: (SQL | undefined)[] = [
      eq(employees.tenantId, user.tenantId),
    ];
    if (q) {
      conditions.push(
        or(
          ilike(employees.name, `%${q}%`),
          ilike(employees.email, `%${q}%`),
          ilike(employees.employeeId, `%${q}%`),
        ),
      );
    }
    if (department) conditions.push(eq(employees.department, department));
    if (status) conditions.push(eq(employees.status, status));

    const manager = alias(employees, "manager");
    const rows = await db
      .select({
        id: employees.id,
        name: employees.name,
        email: employees.email,
        phone: employees.phone,
        designation: employees.designation,
        department: employees.department,
        address: employees.address,
        status: employees.status,
        joinDate: employees.joinDate,
        employmentType: employees.employmentType,
        employeeId: employees.employeeId,
        managerName: manager.name,
      })
      .from(employees)
      .leftJoin(manager, eq(employees.managerId, manager.id))
      .where(and(...conditions))
      .orderBy(asc(employees.name));

    // Latest salary (by effective date) per employee, else 0.
    const ids = rows.map((r) => r.id);
    const salaryMap = new Map<string, number>();
    if (ids.length > 0) {
      const salaryRows = await db
        .select({ employeeId: salary.employeeId, gross: salary.gross })
        .from(salary)
        .where(
          and(
            eq(salary.tenantId, user.tenantId),
            inArray(salary.employeeId, ids),
          ),
        )
        .orderBy(desc(salary.effectiveFrom));
      for (const s of salaryRows) {
        if (!salaryMap.has(s.employeeId)) salaryMap.set(s.employeeId, s.gross);
      }
    }

    const items: EmployeeListShape[] = rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      role: r.designation,
      department: r.department,
      address: r.address,
      status: r.status,
      joinedAt: r.joinDate,
      employmentType: r.employmentType,
      employeeId: r.employeeId,
      manager: r.managerName,
      salary: salaryMap.get(r.id) ?? 0,
    }));
    return ok(paginate(items, page, pageSize));
  } finally {
    await pool.end();
  }
});

/** POST /api/employees — create an employee (auto employeeId + salary row). */
export const POST = route(async (request: Request) => {
  const user = await requireRole(["admin", "hr"]);
  const body = await parseJson(request);
  if (!body) throw new ApiError(400, "Invalid request body");

  const name = asString(body.name).trim();
  if (!name) throw new ApiError(400, "Name is required");
  const email = asString(body.email).trim().toLowerCase();
  if (!EMAIL_RE.test(email))
    throw new ApiError(400, "A valid email is required");

  const { db, pool } = await getDb();
  const { employees, salary, tenants } = await import("@db/schema");
  try {
    const dup = await db
      .select({ id: employees.id })
      .from(employees)
      .where(
        and(eq(employees.tenantId, user.tenantId), eq(employees.email, email)),
      )
      .limit(1);
    if (dup[0])
      throw new ApiError(409, "An employee with this email already exists");

    // Validate manager reference before relying on the FK.
    let managerId: string | null = null;
    if (body.managerId !== undefined && body.managerId !== null) {
      managerId = asString(body.managerId);
      if (!UUID_RE.test(managerId)) throw new ApiError(400, "Invalid manager");
      const managerRow = await db
        .select({ id: employees.id })
        .from(employees)
        .where(
          and(
            eq(employees.id, managerId),
            eq(employees.tenantId, user.tenantId),
          ),
        )
        .limit(1);
      if (!managerRow[0]) {
        throw new ApiError(400, "Manager not found in this organization");
      }
    }

    const count = await db
      .select({ id: employees.id })
      .from(employees)
      .where(eq(employees.tenantId, user.tenantId));
    const prefix = employeeIdPrefix(
      (
        await db
          .select({ settings: tenants.settings })
          .from(tenants)
          .where(eq(tenants.id, user.tenantId))
          .limit(1)
      )[0]?.settings,
    );
    const employeeId = `${prefix}-${String(count.length + 1).padStart(3, "0")}`;

    const joinDate = asDate(body.joinDate);

    // Salary: per-component breakdown object ({ basic, hra, … }) or a single
    // annual amount (legacy). Stored on the employee JSON field and mirrored
    // to the salary table.
    let salaryBreakdown: Record<string, number> | null = null;
    if (body.salary !== undefined && body.salary !== null) {
      if (typeof body.salary === "object" && !Array.isArray(body.salary)) {
        salaryBreakdown = mergeSalaryBreakdown(body.salary);
      } else {
        const amount = Number(body.salary);
        if (!Number.isFinite(amount) || amount < 0) {
          throw new ApiError(400, "Invalid salary");
        }
        salaryBreakdown = mergeSalaryBreakdown({ basic: Math.round(amount) });
      }
    }

    const [created] = await db
      .insert(employees)
      .values({
        tenantId: user.tenantId,
        employeeId,
        name,
        email,
        phone: optStr(body.phone),
        designation: optStr(body.designation),
        department: optStr(body.department),
        address: asJson(body.address),
        managerId,
        joinDate,
        employmentType: asString(body.employmentType).trim() || "full_time",
        status: asString(body.status).trim() || "active",
        salary: salaryBreakdown,
        bankDetails: asJson(body.bankDetails),
        governmentId: asJson(body.governmentId),
        emergencyContact: asJson(body.emergencyContact),
        healthInsurance: asJson(body.healthInsurance),
        pension: asJson(body.pension),
        taxId: optStr(body.taxId),
      })
      .returning();

    // Mirror the breakdown into the salary table (annual amounts, effective
    // from the join date).
    if (salaryBreakdown) {
      const currency =
        (
          await db
            .select({ currency: tenants.currency })
            .from(tenants)
            .where(eq(tenants.id, user.tenantId))
            .limit(1)
        )[0]?.currency ?? "USD";
      await db.insert(salary).values({
        tenantId: user.tenantId,
        employeeId: created.id,
        basic: salaryBreakdown.basic,
        hra: salaryBreakdown.hra,
        allowances: salaryBreakdown.allowances,
        bonus: salaryBreakdown.bonus,
        tax: salaryBreakdown.tax,
        pension: salaryBreakdown.pension,
        insurance: salaryBreakdown.insurance,
        gross: salaryGross(salaryBreakdown),
        effectiveFrom: joinDate ?? today(),
        currency,
      });
    }

    const managerName = created.managerId
      ? ((
          await db
            .select({ name: employees.name })
            .from(employees)
            .where(eq(employees.id, created.managerId))
            .limit(1)
        )[0]?.name ?? null)
      : null;

    await addAudit({
      tenantId: user.tenantId,
      userId: user.id,
      actorName: user.name,
      action: "employee.create",
      target: created.name,
      category: "employee",
    });

    const item: EmployeeListShape = {
      id: created.id,
      name: created.name,
      email: created.email,
      phone: created.phone,
      role: created.designation,
      department: created.department,
      address: created.address,
      status: created.status,
      joinedAt: created.joinDate,
      employmentType: created.employmentType,
      employeeId: created.employeeId,
      manager: managerName,
      salary: salaryBreakdown ? salaryGross(salaryBreakdown) : 0,
    };
    return ok(item);
  } finally {
    await pool.end();
  }
});
