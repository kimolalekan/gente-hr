import { and, desc, eq } from "drizzle-orm";
import {
  ApiError,
  addAudit,
  asString,
  getDb,
  getEmployeeForUser,
  ok,
  parseJson,
  requireUser,
  route,
} from "@/lib/server/api";
import type { SessionUser } from "@/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-fA-F-]{8,}$/;

async function assertAccessibleEmployee(
  user: SessionUser,
  id: string,
): Promise<void> {
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

/** GET /api/employees/[id]/documents — documents on file (newest first). */
export const GET = route(
  async (
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const user = await requireUser();
    const { id } = await params;
    if (!UUID_RE.test(id)) throw new ApiError(404, "Not found");
    await assertAccessibleEmployee(user, id);

    const { db, pool } = await getDb();
    const { employeeDocuments } = await import("@db/schema");
    try {
      const rows = await db
        .select()
        .from(employeeDocuments)
        .where(
          and(
            eq(employeeDocuments.tenantId, user.tenantId),
            eq(employeeDocuments.employeeId, id),
          ),
        )
        .orderBy(desc(employeeDocuments.uploadedAt));
      return ok(rows);
    } finally {
      await pool.end();
    }
  },
);

/** POST /api/employees/[id]/documents — attach a document (status pending). */
export const POST = route(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireUser();
    const { id } = await params;
    if (!UUID_RE.test(id)) throw new ApiError(404, "Not found");
    await assertAccessibleEmployee(user, id);

    const body = await parseJson(request);
    if (!body) throw new ApiError(400, "Invalid request body");

    const name = asString(body.name).trim();
    const category = asString(body.category).trim();
    if (!name) throw new ApiError(400, "Document name is required");
    if (!category) throw new ApiError(400, "Document category is required");

    const fileUrl = body.fileId
      ? `/api/files/${asString(body.fileId)}`
      : typeof body.fileUrl === "string" && body.fileUrl.trim()
        ? body.fileUrl.trim()
        : null;

    const { db, pool } = await getDb();
    const { employeeDocuments } = await import("@db/schema");
    try {
      const [created] = await db
        .insert(employeeDocuments)
        .values({
          tenantId: user.tenantId,
          employeeId: id,
          name,
          category,
          status: "pending",
          fileUrl,
        })
        .returning();

      if (user.role !== "member") {
        await addAudit({
          tenantId: user.tenantId,
          userId: user.id,
          actorName: user.name,
          action: "employee.document.create",
          target: name,
          category: "employee",
        });
      }
      return ok(created);
    } finally {
      await pool.end();
    }
  },
);
