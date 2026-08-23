import { and, desc, eq, ne } from "drizzle-orm";
import {
  ApiError,
  addAudit,
  asDate,
  asString,
  getDb,
  getEmployeeForUser,
  ok,
  parseJson,
  requireRole,
  requireUser,
  route,
} from "@/lib/server/api";
import { mergeSalaryBreakdown, salaryGross } from "@/lib/hr-data";
import type { SessionUser } from "@/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-fA-F-]{8,}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

async function resolveEmployee(tenantId: string, id: string) {
  const { db, pool } = await getDb();
  const { employees } = await import("@db/schema");
  try {
    const rows = await db
      .select()
      .from(employees)
      .where(and(eq(employees.id, id), eq(employees.tenantId, tenantId)))
      .limit(1);
    const row = rows[0];
    if (!row) throw new ApiError(404, "Employee not found");
    return row;
  } finally {
    await pool.end();
  }
}

/** Admin/HR may access any employee; members only their own record. */
async function resolveAccessibleEmployee(user: SessionUser, id: string) {
  if (user.role === "member") {
    const own = await getEmployeeForUser(user.tenantId, user.id);
    if (!own || own.id !== id) {
      throw new ApiError(403, "You don't have permission to do this");
    }
  }
  return resolveEmployee(user.tenantId, id);
}

/** GET /api/employees/[id] — full profile + manager + salary + docs count. */
export const GET = route(
  async (
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const user = await requireUser();
    const { id } = await params;
    if (!UUID_RE.test(id)) throw new ApiError(404, "Not found");

    const employee = await resolveAccessibleEmployee(user, id);

    const { db, pool } = await getDb();
    const { employees, salary, employeeDocuments } = await import("@db/schema");
    try {
      const managerRow = employee.managerId
        ? (
            await db
              .select({ name: employees.name })
              .from(employees)
              .where(
                and(
                  eq(employees.id, employee.managerId),
                  eq(employees.tenantId, user.tenantId),
                ),
              )
              .limit(1)
          )[0]
        : null;

      const salaryRows = await db
        .select()
        .from(salary)
        .where(
          and(
            eq(salary.tenantId, user.tenantId),
            eq(salary.employeeId, employee.id),
          ),
        )
        .orderBy(desc(salary.effectiveFrom))
        .limit(1);

      const docs = await db
        .select({ id: employeeDocuments.id })
        .from(employeeDocuments)
        .where(
          and(
            eq(employeeDocuments.tenantId, user.tenantId),
            eq(employeeDocuments.employeeId, employee.id),
          ),
        );

      // Salary breakdown from the employee JSON field; falls back to the
      // latest salary-table row (legacy data).
      const salaryRow = salaryRows[0] ?? null;
      const breakdown = mergeSalaryBreakdown(
        employee.salary ??
          (salaryRow
            ? {
                basic: salaryRow.basic,
                hra: salaryRow.hra,
                allowances: salaryRow.allowances,
                bonus: salaryRow.bonus,
                tax: salaryRow.tax,
                pension: salaryRow.pension,
                insurance: salaryRow.insurance,
              }
            : null),
      );
      const gross = salaryGross(breakdown) || salaryRow?.gross || 0;

      return ok({
        ...employee,
        managerName: managerRow?.name ?? null,
        salary: breakdown,
        salaryGross: gross,
        documentCount: docs.length,
      });
    } finally {
      await pool.end();
    }
  },
);

/** PATCH /api/employees/[id] — admin/hr: edit profile (+ optional salary). */
export const PATCH = route(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireRole(["admin", "hr"]);
    const { id } = await params;
    if (!UUID_RE.test(id)) throw new ApiError(404, "Not found");

    const body = await parseJson(request);
    if (!body) throw new ApiError(400, "Invalid request body");

    const employee = await resolveEmployee(user.tenantId, id);

    const { db, pool } = await getDb();
    const { employees, salary, tenants } = await import("@db/schema");
    try {
      const set: Partial<typeof employees.$inferInsert> = {};
      if (body.name !== undefined) {
        const name = asString(body.name).trim();
        if (!name) throw new ApiError(400, "Name cannot be empty");
        set.name = name;
      }
      if (body.email !== undefined) {
        const email = asString(body.email).trim().toLowerCase();
        if (!EMAIL_RE.test(email))
          throw new ApiError(400, "A valid email is required");
        const dup = await db
          .select({ id: employees.id })
          .from(employees)
          .where(
            and(
              eq(employees.tenantId, user.tenantId),
              eq(employees.email, email),
              ne(employees.id, id),
            ),
          )
          .limit(1);
        if (dup[0])
          throw new ApiError(409, "Another employee already has this email");
        set.email = email;
      }
      if (body.phone !== undefined) set.phone = optStr(body.phone);
      if (body.designation !== undefined)
        set.designation = optStr(body.designation);
      if (body.department !== undefined)
        set.department = optStr(body.department);
      if (body.address !== undefined) set.address = asJson(body.address);
      if (body.managerId !== undefined) {
        if (body.managerId === null) {
          set.managerId = null;
        } else {
          const managerId = asString(body.managerId);
          if (!UUID_RE.test(managerId))
            throw new ApiError(400, "Invalid manager");
          if (managerId === id) {
            throw new ApiError(400, "An employee cannot manage themselves");
          }
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
          set.managerId = managerId;
        }
      }
      if (body.joinDate !== undefined) set.joinDate = asDate(body.joinDate);
      if (body.employmentType !== undefined) {
        set.employmentType =
          asString(body.employmentType).trim() || "full_time";
      }
      if (body.status !== undefined) {
        set.status = asString(body.status).trim() || "active";
      }
      if (body.emergencyContact !== undefined)
        set.emergencyContact = asJson(body.emergencyContact);
      if (body.bankDetails !== undefined)
        set.bankDetails = asJson(body.bankDetails);
      if (body.governmentId !== undefined)
        set.governmentId = asJson(body.governmentId);
      if (body.healthInsurance !== undefined)
        set.healthInsurance = asJson(body.healthInsurance);
      if (body.pension !== undefined) set.pension = asJson(body.pension);
      if (body.taxId !== undefined) set.taxId = optStr(body.taxId);
      if (body.profilePhoto !== undefined)
        set.profilePhoto = optStr(body.profilePhoto);

      // Salary: per-component breakdown object ({ basic, hra, … }) or a single
      // annual amount (legacy). Stored on the employee JSON field and mirrored
      // to the salary table so payroll runs keep working.
      if (body.salary !== undefined && body.salary !== null) {
        const breakdown =
          typeof body.salary === "object" && !Array.isArray(body.salary)
            ? mergeSalaryBreakdown(body.salary)
            : (() => {
                const amount = Number(body.salary);
                if (!Number.isFinite(amount) || amount < 0) {
                  throw new ApiError(400, "Invalid salary");
                }
                return mergeSalaryBreakdown({ basic: Math.round(amount) });
              })();
        set.salary = breakdown;
        const gross = salaryGross(breakdown);
        const effectiveFrom =
          asDate(body.joinDate) ?? employee.joinDate ?? today();
        const currency =
          (
            await db
              .select({ currency: tenants.currency })
              .from(tenants)
              .where(eq(tenants.id, user.tenantId))
              .limit(1)
          )[0]?.currency ?? "USD";
        const salaryValues = {
          basic: breakdown.basic,
          hra: breakdown.hra,
          allowances: breakdown.allowances,
          bonus: breakdown.bonus,
          tax: breakdown.tax,
          pension: breakdown.pension,
          insurance: breakdown.insurance,
          gross,
          effectiveFrom,
          currency,
        };
        const existing = await db
          .select({ id: salary.id })
          .from(salary)
          .where(
            and(eq(salary.tenantId, user.tenantId), eq(salary.employeeId, id)),
          )
          .orderBy(desc(salary.effectiveFrom))
          .limit(1);
        if (existing[0]) {
          await db
            .update(salary)
            .set(salaryValues)
            .where(eq(salary.id, existing[0].id));
        } else {
          await db.insert(salary).values({
            tenantId: user.tenantId,
            employeeId: id,
            ...salaryValues,
          });
        }
      }

      if (Object.keys(set).length === 0) {
        throw new ApiError(400, "Nothing to update");
      }

      const [updated] = await db
        .update(employees)
        .set({ ...set, updatedAt: new Date() })
        .where(and(eq(employees.id, id), eq(employees.tenantId, user.tenantId)))
        .returning();

      const managerName = updated.managerId
        ? ((
            await db
              .select({ name: employees.name })
              .from(employees)
              .where(eq(employees.id, updated.managerId))
              .limit(1)
          )[0]?.name ?? null)
        : null;
      const latestSalary =
        (
          await db
            .select({ gross: salary.gross })
            .from(salary)
            .where(
              and(
                eq(salary.tenantId, user.tenantId),
                eq(salary.employeeId, id),
              ),
            )
            .orderBy(desc(salary.effectiveFrom))
            .limit(1)
        )[0]?.gross ?? 0;

      await addAudit({
        tenantId: user.tenantId,
        userId: user.id,
        actorName: user.name,
        action: "employee.update",
        target: updated.name,
        category: "employee",
      });

      const breakdown = mergeSalaryBreakdown(updated.salary);
      return ok({
        id: updated.id,
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        role: updated.designation,
        department: updated.department,
        address: updated.address,
        status: updated.status,
        joinedAt: updated.joinDate,
        employmentType: updated.employmentType,
        employeeId: updated.employeeId,
        manager: managerName,
        salary: breakdown,
        salaryGross: salaryGross(breakdown) || latestSalary,
      });
    } finally {
      await pool.end();
    }
  },
);

/** DELETE /api/employees/[id] — admin: soft-archive (status → "inactive"). */
export const DELETE = route(
  async (
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const user = await requireRole(["admin"]);
    const { id } = await params;
    if (!UUID_RE.test(id)) throw new ApiError(404, "Not found");

    const employee = await resolveEmployee(user.tenantId, id);
    if (employee.status !== "active") {
      throw new ApiError(409, "Employee is already inactive");
    }

    const { db, pool } = await getDb();
    const { employees } = await import("@db/schema");
    try {
      const [updated] = await db
        .update(employees)
        .set({ status: "inactive", updatedAt: new Date() })
        .where(and(eq(employees.id, id), eq(employees.tenantId, user.tenantId)))
        .returning();

      await addAudit({
        tenantId: user.tenantId,
        userId: user.id,
        actorName: user.name,
        action: "employee.delete",
        target: updated.name,
        category: "employee",
      });
      return ok(updated);
    } finally {
      await pool.end();
    }
  },
);
