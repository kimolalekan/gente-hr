import { and, desc, eq } from "drizzle-orm";
import {
  ApiError,
  getDb,
  getEmployeeForUser,
  ok,
  requireUser,
  route,
} from "@/lib/server/api";
import type { SessionUser } from "@/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-fA-F-]{8,}$/;

async function assertAccessibleEmployee(user: SessionUser, id: string): Promise<void> {
  if (user.role === "member") {
    const own = await getEmployeeForUser(user.tenantId, user.id);
    if (!own || own.id !== id) {
      throw new ApiError(403, "You don't have permission to do this");
    }
  } else {
    const { db, pool } = await getDb();
    const { employees } = await import("@db/schema");
    try {
      const rows = await db
        .select({ id: employees.id })
        .from(employees)
        .where(and(eq(employees.id, id), eq(employees.tenantId, user.tenantId)))
        .limit(1);
      if (!rows[0]) throw new ApiError(404, "Employee not found");
    } finally {
      await pool.end();
    }
  }
}

/** GET /api/employees/[id]/payslips — payslips for the employee. */
export const GET = route(
  async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireUser();
    const { id } = await params;
    if (!UUID_RE.test(id)) throw new ApiError(404, "Not found");
    await assertAccessibleEmployee(user, id);

    const { db, pool } = await getDb();
    const { payslips } = await import("@db/schema");
    try {
      const rows = await db
        .select()
        .from(payslips)
        .where(
          and(eq(payslips.tenantId, user.tenantId), eq(payslips.employeeId, id)),
        )
        .orderBy(desc(payslips.createdAt));
      return ok(rows);
    } finally {
      await pool.end();
    }
  },
);
