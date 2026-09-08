import { and, eq } from "drizzle-orm";
import {
  ApiError,
  getDb,
  getEmployeeForUser,
  ok,
  requireUser,
  route,
} from "@/lib/server/api";
import { toProcurement } from "@/lib/server/procurement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/procurements/[id] — one request with requester/approver details.
 * Members may only open requests they raised (admin/HR see everything).
 */
export const GET = route(
  async (
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const user = await requireUser();
    const { id } = await params;

    const { db, pool } = await getDb();
    try {
      const { procurementRequests, employees, users } = await import("@db/schema");

      const [row] = await db
        .select({
          row: procurementRequests,
          requester: {
            id: employees.id,
            name: employees.name,
            email: employees.email,
          },
          approver: {
            id: users.id,
            name: users.name,
            email: users.email,
          },
        })
        .from(procurementRequests)
        .leftJoin(employees, eq(procurementRequests.requestedById, employees.id))
        .leftJoin(users, eq(procurementRequests.approvedById, users.id))
        .where(
          and(
            eq(procurementRequests.id, id),
            eq(procurementRequests.tenantId, user.tenantId),
          ),
        )
        .limit(1);
      if (!row) throw new ApiError(404, "Request not found");

      if (user.role === "member") {
        const employee = await getEmployeeForUser(user.tenantId, user.id);
        if (!employee || employee.id !== row.row.requestedById) {
          throw new ApiError(404, "Request not found");
        }
      }

      return ok(
        toProcurement({
          row: row.row,
          requester: row.requester,
          approver: row.approver,
        }),
      );
    } finally {
      await pool.end();
    }
  },
);
