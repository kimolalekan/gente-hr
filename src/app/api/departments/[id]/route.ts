import { and, eq } from "drizzle-orm";
import {
  ApiError,
  addAudit,
  asString,
  getDb,
  ok,
  parseJson,
  requireRole,
  route,
} from "@/lib/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-fA-F-]{8,}$/;

/** PATCH /api/departments/[id] — edit name/description. */
export const PATCH = route(
  async (
    request: Request,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const user = await requireRole(["admin"]);
    const { id } = await params;
    if (!UUID_RE.test(id)) throw new ApiError(404, "Not found");

    const body = await parseJson(request);
    if (!body) throw new ApiError(400, "Invalid request body");

    const { db, pool } = await getDb();
    const { departments } = await import("@db/schema");
    try {
      const rows = await db
        .select()
        .from(departments)
        .where(and(eq(departments.id, id), eq(departments.tenantId, user.tenantId)))
        .limit(1);
      const dept = rows[0];
      if (!dept) throw new ApiError(404, "Department not found");

      const set: Partial<typeof departments.$inferInsert> = {};
      if (body.name !== undefined) {
        const name = asString(body.name).trim();
        if (!name) throw new ApiError(400, "Department name cannot be empty");
        const existing = await db
          .select({ id: departments.id, name: departments.name })
          .from(departments)
          .where(eq(departments.tenantId, user.tenantId));
        if (
          existing.some(
            (d) => d.id !== id && d.name.toLowerCase() === name.toLowerCase(),
          )
        ) {
          throw new ApiError(409, "A department with this name already exists");
        }
        set.name = name;
      }
      if (body.description !== undefined) {
        set.description =
          typeof body.description === "string" && body.description.trim()
            ? body.description.trim()
            : null;
      }
      if (Object.keys(set).length === 0) {
        throw new ApiError(400, "Nothing to update");
      }

      const [updated] = await db
        .update(departments)
        .set({ ...set, updatedAt: new Date() })
        .where(and(eq(departments.id, id), eq(departments.tenantId, user.tenantId)))
        .returning();

      await addAudit({
        tenantId: user.tenantId,
        userId: user.id,
        actorName: user.name,
        action: "department.update",
        target: updated.name,
        category: "settings",
      });
      return ok(updated);
    } finally {
      await pool.end();
    }
  },
);

/** DELETE /api/departments/[id] — 409 while employees are assigned. */
export const DELETE = route(
  async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireRole(["admin"]);
    const { id } = await params;
    if (!UUID_RE.test(id)) throw new ApiError(404, "Not found");

    const { db, pool } = await getDb();
    const { departments, employees } = await import("@db/schema");
    try {
      const rows = await db
        .select()
        .from(departments)
        .where(and(eq(departments.id, id), eq(departments.tenantId, user.tenantId)))
        .limit(1);
      const dept = rows[0];
      if (!dept) throw new ApiError(404, "Department not found");

      const assigned = await db
        .select({ id: employees.id })
        .from(employees)
        .where(
          and(
            eq(employees.tenantId, user.tenantId),
            eq(employees.department, dept.name),
          ),
        )
        .limit(1);
      if (assigned[0]) {
        throw new ApiError(409, "Department still has employees assigned");
      }

      await db
        .delete(departments)
        .where(and(eq(departments.id, id), eq(departments.tenantId, user.tenantId)));

      await addAudit({
        tenantId: user.tenantId,
        userId: user.id,
        actorName: user.name,
        action: "department.delete",
        target: dept.name,
        category: "settings",
      });
      return ok({ deleted: true });
    } finally {
      await pool.end();
    }
  },
);
