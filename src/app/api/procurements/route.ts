import { and, desc, eq } from "drizzle-orm";
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
} from "@/lib/server/api";
import {
  isProcurementStatus,
  sanitizeText,
  sanitizeVendors,
} from "@/lib/procurement";
import { toProcurement } from "@/lib/server/procurement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/procurements — paginated list. Admin/HR see every request in the
 * tenant; members only see their own. Optional `status` filter.
 */
export const GET = route(async (request: Request) => {
  const user = await requireUser();
  const { db, pool } = await getDb();
  try {
    const { procurementRequests, employees, users } =
      await import("@db/schema");
    const url = new URL(request.url);
    const page = asInt(url.searchParams.get("page"), 1);
    const pageSize = asInt(url.searchParams.get("pageSize"), 20);
    const statusParam = asString(url.searchParams.get("status"));

    const conditions = [eq(procurementRequests.tenantId, user.tenantId)];
    if (statusParam) {
      if (!isProcurementStatus(statusParam)) {
        throw new ApiError(422, "Invalid status filter");
      }
      conditions.push(eq(procurementRequests.status, statusParam));
    }

    if (user.role === "member") {
      const employee = await getEmployeeForUser(user.tenantId, user.id);
      if (!employee) return ok(paginate([], page, pageSize));
      conditions.push(eq(procurementRequests.requestedById, employee.id));
    }

    const rows = await db
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
      .where(and(...conditions))
      .orderBy(desc(procurementRequests.createdAt));

    const items = rows.map(({ row, requester, approver }) =>
      toProcurement({ row, requester, approver }),
    );
    return ok(paginate(items, page, pageSize));
  } finally {
    await pool.end();
  }
});

/**
 * POST /api/procurements — create a procurement request. Members request for
 * themselves; admin/HR pick the requesting employee (`employeeId`).
 */
export const POST = route(async (request: Request) => {
  const user = await requireUser();
  const body = await parseJson(request);
  if (!body) throw new ApiError(400, "Invalid request body");

  const text = sanitizeText({
    title: body.title,
    description: body.description,
  });
  if (!text.ok) throw new ApiError(422, text.error);

  const vendorsResult = sanitizeVendors(body.vendors);
  if (!vendorsResult.ok) throw new ApiError(422, vendorsResult.error);

  // Members request for themselves; admin/HR must name an employee.
  let requestedById = asString(body.employeeId);
  if (user.role === "member") {
    if (requestedById) {
      throw new ApiError(403, "You can only request procurement for yourself");
    }
    const employee = await getEmployeeForUser(user.tenantId, user.id);
    if (!employee) {
      throw new ApiError(403, "No employee profile linked to your account");
    }
    requestedById = employee.id;
  } else if (!requestedById) {
    throw new ApiError(422, "employeeId is required");
  }

  const { db, pool } = await getDb();
  try {
    const { procurementRequests, employees } = await import("@db/schema");

    // Confirm the named employee belongs to this tenant.
    const [employee] = await db
      .select({
        id: employees.id,
        name: employees.name,
        email: employees.email,
      })
      .from(employees)
      .where(
        and(
          eq(employees.id, requestedById),
          eq(employees.tenantId, user.tenantId),
        ),
      )
      .limit(1);
    if (!employee) throw new ApiError(404, "Employee not found");

    const [created] = await db
      .insert(procurementRequests)
      .values({
        tenantId: user.tenantId,
        title: text.title,
        description: text.description,
        vendors: vendorsResult.vendors,
        status: "PENDING",
        requestedById: employee.id,
      })
      .returning();

    await addAudit({
      tenantId: user.tenantId,
      userId: user.id,
      actorName: user.name,
      action: "procurement.create",
      target: created.id,
      category: "procurement",
    });

    return ok(toProcurement({ row: created, requester: employee }), {
      status: 201,
    });
  } finally {
    await pool.end();
  }
});
