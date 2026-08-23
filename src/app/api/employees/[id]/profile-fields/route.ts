import { and, eq } from "drizzle-orm";
import {
  ApiError,
  addAudit,
  getDb,
  ok,
  parseJson,
  requireUser,
  route,
} from "@/lib/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-fA-F-]{8,}$/;

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

/**
 * PATCH /api/employees/[id]/profile-fields — self-service only.
 * The employee row must be linked to the session user (member own ONLY).
 */
export const PATCH = route(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireUser();
    const { id } = await params;
    if (!UUID_RE.test(id)) throw new ApiError(404, "Not found");

    const body = await parseJson(request);
    if (!body) throw new ApiError(400, "Invalid request body");

    const { db, pool } = await getDb();
    const { employees } = await import("@db/schema");
    try {
      const rows = await db
        .select()
        .from(employees)
        .where(and(eq(employees.id, id), eq(employees.tenantId, user.tenantId)))
        .limit(1);
      const employee = rows[0];
      if (!employee) throw new ApiError(404, "Employee not found");
      if (employee.userId !== user.id) {
        throw new ApiError(403, "You can only update your own profile");
      }

      const set: Partial<typeof employees.$inferInsert> = {};
      if (body.bankDetails !== undefined)
        set.bankDetails = asJson(body.bankDetails);
      if (body.governmentId !== undefined)
        set.governmentId = asJson(body.governmentId);
      if (body.emergencyContact !== undefined) {
        set.emergencyContact = asJson(body.emergencyContact);
      }
      if (body.taxId !== undefined) set.taxId = optStr(body.taxId);
      if (body.pension !== undefined) {
        set.pension = asJson(body.pension);
      }
      if (Object.keys(set).length === 0) {
        throw new ApiError(400, "Nothing to update");
      }

      const [updated] = await db
        .update(employees)
        .set({ ...set, updatedAt: new Date() })
        .where(and(eq(employees.id, id), eq(employees.tenantId, user.tenantId)))
        .returning();

      await addAudit({
        tenantId: user.tenantId,
        userId: user.id,
        actorName: user.name,
        action: "employee.profile",
        target: employee.name,
        category: "employee",
      });
      return ok(updated);
    } finally {
      await pool.end();
    }
  },
);
