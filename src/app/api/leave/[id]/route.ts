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

/** Leave request detail with the employee name (member: own only). */
export const GET = route(
  async (
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const user = await requireUser();
    const { id } = await params;

    const { db, pool } = await getDb();
    try {
      const { leaves, employees } = await import("@db/schema");
      const [leave] = await db
        .select()
        .from(leaves)
        .where(and(eq(leaves.id, id), eq(leaves.tenantId, user.tenantId)))
        .limit(1);
      if (!leave) throw new ApiError(404, "Leave request not found");

      if (user.role === "member") {
        const employee = await getEmployeeForUser(user.tenantId, user.id);
        if (!employee || employee.id !== leave.employeeId) {
          throw new ApiError(403, "You don't have permission to do this");
        }
      }

      const [employee] = await db
        .select({ id: employees.id, name: employees.name, email: employees.email })
        .from(employees)
        .where(eq(employees.id, leave.employeeId))
        .limit(1);

      return ok({ ...leave, employeeName: employee?.name ?? null });
    } finally {
      await pool.end();
    }
  },
);
