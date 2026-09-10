import { and, eq } from "drizzle-orm";
import {
  addAudit,
  ApiError,
  getDb,
  getEmployeeForUser,
  ok,
  parseJson,
  requireUser,
  route,
} from "@/lib/server/api";
import { sanitizeText, sanitizeVendors } from "@/lib/procurement";
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
      const { procurementRequests, employees, users } =
        await import("@db/schema");

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
        .leftJoin(
          employees,
          eq(procurementRequests.requestedById, employees.id),
        )
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

/**
 * PATCH /api/procurements/[id] — edit a request while it is still PENDING
 * (title, description and the vendor quotes). The requester (or admin/HR
 * acting for the tenant) can adjust the request before it is decided.
 */
export const PATCH = route(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireUser();
    const { id } = await params;
    const body = await parseJson(request);
    if (!body) throw new ApiError(400, "Invalid request body");

    const text = sanitizeText({
      title: body.title,
      description: body.description,
    });
    if (!text.ok) throw new ApiError(422, text.error);

    const vendorsResult = sanitizeVendors(body.vendors);
    if (!vendorsResult.ok) throw new ApiError(422, vendorsResult.error);

    const { db, pool } = await getDb();
    try {
      const { procurementRequests, employees, users } =
        await import("@db/schema");

      const [existing] = await db
        .select()
        .from(procurementRequests)
        .where(
          and(
            eq(procurementRequests.id, id),
            eq(procurementRequests.tenantId, user.tenantId),
          ),
        )
        .limit(1);
      if (!existing) throw new ApiError(404, "Request not found");
      if (existing.status !== "PENDING") {
        throw new ApiError(409, "Only pending requests can be edited");
      }

      // Members may only edit requests they raised; admin/HR edit anything.
      if (user.role === "member") {
        const employee = await getEmployeeForUser(user.tenantId, user.id);
        if (!employee || employee.id !== existing.requestedById) {
          throw new ApiError(404, "Request not found");
        }
      }

      const [updated] = await db
        .update(procurementRequests)
        .set({
          title: text.title,
          description: text.description,
          vendors: vendorsResult.vendors,
          updatedAt: new Date(),
        })
        .where(eq(procurementRequests.id, id))
        .returning();

      const [requester] = await db
        .select({
          id: employees.id,
          name: employees.name,
          email: employees.email,
        })
        .from(employees)
        .where(eq(employees.id, existing.requestedById))
        .limit(1);
      const [approver] = existing.approvedById
        ? await db
            .select({
              id: users.id,
              name: users.name,
              email: users.email,
            })
            .from(users)
            .where(eq(users.id, existing.approvedById))
            .limit(1)
        : [];

      await addAudit({
        tenantId: user.tenantId,
        userId: user.id,
        actorName: user.name,
        action: "procurement.update",
        target: updated.id,
        category: "procurement",
      });

      return ok(
        toProcurement({
          row: updated,
          requester: requester ?? null,
          approver: approver ?? null,
        }),
      );
    } finally {
      await pool.end();
    }
  },
);
